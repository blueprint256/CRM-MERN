const express = require('express');
const { body, validationResult } = require('express-validator');
const User = require('../models/User');
const Project = require('../models/Project');
const { authenticate } = require('../middleware/auth');
const canvaService = require('../services/canva');
const logger = require('../utils/logger');
const { deleteFromS3, getKeyFromUrl } = require('../config/s3');

const router = express.Router();

// Store for PKCE code verifiers (in production, use Redis or similar)
const codeVerifierStore = new Map();

// Store for active Canva editing sessions (maps visitorId to session data)
const activeEditSessions = new Map();

// Helper function to provide hints for OAuth errors
const getOAuthErrorHint = (error) => {
  const hints = {
    'invalid_request': 'Check: 1) CANVA_CLIENT_ID is correct, 2) CANVA_REDIRECT_URI exactly matches Canva Developer Portal (use 127.0.0.1 not localhost), 3) All required scopes are enabled in Canva Developer Portal',
    'invalid_client': 'The client_id or client_secret is invalid. Verify credentials in Canva Developer Portal.',
    'invalid_grant': 'The authorization code is invalid or expired. Try again.',
    'unauthorized_client': 'The client is not authorized for this grant type. Check Canva Developer Portal settings.',
    'unsupported_grant_type': 'Grant type not supported. This is likely a code issue.',
    'invalid_scope': 'One or more requested scopes are invalid or not enabled in Canva Developer Portal.',
    'access_denied': 'User denied access or the integration is not approved.'
  };
  return hints[error] || 'Unknown error. Check Canva Developer Portal configuration.';
};

// GET /api/canva/status - Check if user has connected Canva
router.get('/status', authenticate, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    const isConnected = !!(user.canvaAccessToken && user.canvaRefreshToken);

    res.json({
      connected: isConnected,
      canvaUserId: user.canvaUserId || null
    });
  } catch (error) {
    logger.logError(error, { context: 'canva.status', userId: req.user._id });
    res.status(500).json({ error: 'Error checking Canva connection status' });
  }
});

// GET /api/canva/auth - Initiate Canva OAuth flow
router.get('/auth', authenticate, async (req, res) => {
  try {
    const codeVerifier = canvaService.generateCodeVerifier();
    const codeChallenge = canvaService.generateCodeChallenge(codeVerifier);
    const state = canvaService.generateState();

    // Store code verifier with state as key (expires in 10 minutes)
    codeVerifierStore.set(state, {
      codeVerifier,
      userId: req.user._id.toString(),
      expiresAt: Date.now() + 10 * 60 * 1000
    });

    // Clean up expired entries
    for (const [key, value] of codeVerifierStore.entries()) {
      if (value.expiresAt < Date.now()) {
        codeVerifierStore.delete(key);
      }
    }

    const authUrl = canvaService.buildAuthorizationUrl(codeChallenge, state);

    logger.info('Canva OAuth initiated', { userId: req.user._id });
    res.json({ authUrl });
  } catch (error) {
    logger.logError(error, { context: 'canva.auth', userId: req.user._id });
    res.status(500).json({ error: 'Error initiating Canva authentication' });
  }
});

// GET /api/canva/callback - Handle Canva OAuth callback
router.get('/callback', async (req, res) => {
  try {
    const { code, state, error: oauthError, error_description: errorDescription, correlation_jwt } = req.query;

    // Log all callback parameters for debugging
    logger.info('Canva callback received', {
      hasCode: !!code,
      hasState: !!state,
      hasCorrelationJwt: !!correlation_jwt,
      error: oauthError || null,
      errorDescription: errorDescription || null,
      allParams: Object.keys(req.query)
    });

    // Handle return navigation from Canva editor (not OAuth)
    if (correlation_jwt && !code && !state) {
      logger.info('Canva return navigation received', { correlationJwt: correlation_jwt.substring(0, 20) + '...' });
      // Redirect to the CanvaReturn page for auto-save handling
      return res.redirect(`${process.env.CLIENT_URL}/canva-return`);
    }

    if (oauthError) {
      logger.warn('Canva OAuth error', {
        error: oauthError,
        description: errorDescription,
        hint: getOAuthErrorHint(oauthError)
      });
      return res.redirect(`${process.env.CLIENT_URL}/settings?canva_error=${oauthError}&error_description=${encodeURIComponent(errorDescription || '')}`);
    }

    if (!code || !state) {
      logger.warn('Canva callback missing parameters');
      return res.redirect(`${process.env.CLIENT_URL}/settings?canva_error=missing_params`);
    }

    // Retrieve and validate code verifier
    const storedData = codeVerifierStore.get(state);
    if (!storedData) {
      logger.warn('Canva callback invalid or expired state');
      return res.redirect(`${process.env.CLIENT_URL}/settings?canva_error=invalid_state`);
    }

    const { codeVerifier, userId } = storedData;
    codeVerifierStore.delete(state);

    // Exchange code for tokens
    const tokens = await canvaService.exchangeCodeForTokens(code, codeVerifier);

    // Get Canva user profile
    const profile = await canvaService.getUserProfile(tokens.access_token);

    // Update user with Canva credentials
    await User.findByIdAndUpdate(userId, {
      canvaAccessToken: tokens.access_token,
      canvaRefreshToken: tokens.refresh_token,
      canvaTokenExpiresAt: new Date(Date.now() + tokens.expires_in * 1000),
      canvaUserId: profile.user?.id || profile.id
    });

    logger.logAuth('canva_connect', userId, true);
    res.redirect(`${process.env.CLIENT_URL}/settings?canva_connected=true`);
  } catch (error) {
    logger.logError(error, { context: 'canva.callback' });
    res.redirect(`${process.env.CLIENT_URL}/settings?canva_error=exchange_failed`);
  }
});

// POST /api/canva/disconnect - Disconnect Canva account
router.post('/disconnect', authenticate, async (req, res) => {
  try {
    await User.findByIdAndUpdate(req.user._id, {
      $unset: {
        canvaAccessToken: 1,
        canvaRefreshToken: 1,
        canvaTokenExpiresAt: 1,
        canvaUserId: 1
      }
    });

    logger.logAuth('canva_disconnect', req.user._id, true);
    res.json({ message: 'Canva disconnected successfully' });
  } catch (error) {
    logger.logError(error, { context: 'canva.disconnect', userId: req.user._id });
    res.status(500).json({ error: 'Error disconnecting Canva' });
  }
});

// Middleware to ensure valid Canva token
const ensureCanvaToken = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id);

    if (!user.canvaAccessToken || !user.canvaRefreshToken) {
      return res.status(401).json({ error: 'Canva not connected' });
    }

    // Check if token is expired or about to expire (within 5 minutes)
    const tokenExpiry = user.canvaTokenExpiresAt?.getTime() || 0;
    const isExpiringSoon = tokenExpiry < Date.now() + 5 * 60 * 1000;

    if (isExpiringSoon) {
      logger.info('Refreshing Canva token', { userId: user._id });

      const tokens = await canvaService.refreshAccessToken(user.canvaRefreshToken);

      user.canvaAccessToken = tokens.access_token;
      user.canvaRefreshToken = tokens.refresh_token;
      user.canvaTokenExpiresAt = new Date(Date.now() + tokens.expires_in * 1000);
      await user.save();
    }

    req.canvaToken = user.canvaAccessToken;
    next();
  } catch (error) {
    logger.logError(error, { context: 'canva.ensureToken', userId: req.user._id });
    res.status(401).json({ error: 'Canva authentication failed' });
  }
};

// GET /api/canva/profile - Get Canva user profile
router.get('/profile', authenticate, ensureCanvaToken, async (req, res) => {
  try {
    const profile = await canvaService.getUserProfile(req.canvaToken);
    res.json({ profile });
  } catch (error) {
    logger.logError(error, { context: 'canva.profile', userId: req.user._id });
    res.status(500).json({ error: 'Error fetching Canva profile' });
  }
});

// GET /api/canva/designs - List user's Canva designs
router.get('/designs', authenticate, ensureCanvaToken, async (req, res) => {
  try {
    const { limit, continuation } = req.query;
    const designs = await canvaService.listDesigns(req.canvaToken, {
      limit: parseInt(limit) || 20,
      continuation
    });
    res.json(designs);
  } catch (error) {
    logger.logError(error, { context: 'canva.designs', userId: req.user._id });
    res.status(500).json({ error: 'Error fetching Canva designs' });
  }
});

// POST /api/canva/designs - Create a new design
router.post('/designs', authenticate, ensureCanvaToken, [
  body('title').optional().trim().isLength({ min: 1, max: 255 }),
  body('width').optional().isInt({ min: 40, max: 8000 }),
  body('height').optional().isInt({ min: 40, max: 8000 })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { title, width, height, assetId } = req.body;

    const design = await canvaService.createDesign(req.canvaToken, {
      title,
      width,
      height,
      assetId
    });

    res.json(design);
  } catch (error) {
    logger.logError(error, { context: 'canva.createDesign', userId: req.user._id });
    res.status(500).json({ error: 'Error creating Canva design' });
  }
});

// GET /api/canva/designs/:designId - Get design details
router.get('/designs/:designId', authenticate, ensureCanvaToken, async (req, res) => {
  try {
    const design = await canvaService.getDesign(req.canvaToken, req.params.designId);
    res.json(design);
  } catch (error) {
    logger.logError(error, { context: 'canva.getDesign', designId: req.params.designId, userId: req.user._id });
    res.status(500).json({ error: 'Error fetching Canva design' });
  }
});

// POST /api/canva/projects/:projectId/edit - Create design from project image for editing
router.post('/projects/:projectId/edit', authenticate, ensureCanvaToken, async (req, res) => {
  try {
    const project = await Project.findById(req.params.projectId);

    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    const imageUrl = project.imgDesign || project.imageUrl;

    if (!imageUrl) {
      return res.status(400).json({ error: 'Project has no image to edit' });
    }

    // Download image from S3 or URL
    const imageResponse = await fetch(imageUrl);
    if (!imageResponse.ok) {
      throw new Error('Failed to fetch project image');
    }
    const imageBuffer = Buffer.from(await imageResponse.arrayBuffer());

    // Upload image to Canva as asset
    const fileName = `${project.campaignName || 'Project'}_image`;
    const uploadResult = await canvaService.uploadAsset(req.canvaToken, imageBuffer, fileName);

    // Poll for upload completion
    const uploadComplete = await canvaService.pollJobUntilComplete(
      req.canvaToken,
      uploadResult.job.id,
      canvaService.getAssetUploadJob
    );

    const assetId = uploadComplete.job.asset?.id;

    if (!assetId) {
      throw new Error('Asset upload completed but no asset ID returned');
    }

    // Create design with the uploaded asset
    const design = await canvaService.createDesign(req.canvaToken, {
      title: `Edit: ${project.campaignName || 'Project Image'}`,
      assetId,
      width: 1200,
      height: 1200
    });

    // Store design ID in project for later reference
    project.canvaDesignId = design.design?.id;
    await project.save();

    // Store active edit session for auto-save on return
    activeEditSessions.set(req.user._id.toString(), {
      projectId: project._id.toString(),
      designId: design.design?.id,
      userId: req.user._id.toString(),
      createdAt: Date.now(),
      expiresAt: Date.now() + 24 * 60 * 60 * 1000 // 24 hours
    });

    logger.info('Canva edit session created', {
      projectId: project._id,
      designId: design.design?.id,
      userId: req.user._id
    });

    res.json({
      editUrl: design.design?.urls?.edit_url,
      viewUrl: design.design?.urls?.view_url,
      designId: design.design?.id,
      projectId: project._id.toString()
    });
  } catch (error) {
    logger.logError(error, { context: 'canva.projectEdit', projectId: req.params.projectId, userId: req.user._id });
    res.status(500).json({ error: 'Error creating Canva edit session' });
  }
});

// POST /api/canva/projects/:projectId/save - Save edited design back to project
router.post('/projects/:projectId/save', authenticate, ensureCanvaToken, [
  body('designId').notEmpty().withMessage('Design ID is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const project = await Project.findById(req.params.projectId);
    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    const { designId } = req.body;

    // Create export job
    const exportResult = await canvaService.createExportJob(req.canvaToken, designId, 'png');

    // Poll for export completion
    const exportComplete = await canvaService.pollJobUntilComplete(
      req.canvaToken,
      exportResult.job.id,
      canvaService.getExportJob
    );

    const exportUrl = exportComplete.job.urls?.[0];

    if (!exportUrl) {
      throw new Error('Export completed but no URL returned');
    }

    // Download the exported image
    const imageResponse = await fetch(exportUrl);
    if (!imageResponse.ok) {
      throw new Error('Failed to download exported image');
    }
    const imageBuffer = Buffer.from(await imageResponse.arrayBuffer());

    // Upload to S3
    const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
    const s3Client = new S3Client({
      region: process.env.AWS_REGION,
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
      }
    });

    const key = `projects/${project._id}/canva-edited-${Date.now()}.png`;
    await s3Client.send(new PutObjectCommand({
      Bucket: process.env.AWS_S3_BUCKET,
      Key: key,
      Body: imageBuffer,
      ContentType: 'image/png'
    }));

    const newImageUrl = `https://${process.env.AWS_S3_BUCKET}.s3.${process.env.AWS_REGION}.amazonaws.com/${key}`;

    // Save current image to history before replacing (keep last 10 versions)
    if (project.imgDesign) {
      if (!project.imageHistory) {
        project.imageHistory = [];
      }
      project.imageHistory.unshift({
        url: project.imgDesign,
        source: project.canvaDesignId ? 'canva' : 'upload',
        canvaDesignId: project.canvaDesignId || null,
        createdAt: project.lastCanvaEdit || project.updatedAt,
        createdBy: req.user._id
      });
      // Keep only last 10 versions
      if (project.imageHistory.length > 10) {
        const removedImages = project.imageHistory.splice(10);
        // Optionally delete old images from S3
        for (const img of removedImages) {
          const oldKey = getKeyFromUrl(img.url);
          if (oldKey) {
            deleteFromS3(oldKey).catch(err => {
              logger.warn('Failed to delete old history image from S3', { key: oldKey });
            });
          }
        }
      }
    }

    // Update project with new image
    project.imgDesign = newImageUrl;
    project.canvaDesignId = designId;
    project.lastCanvaEdit = new Date();
    await project.save();

    logger.info('Canva edited image saved to project', {
      projectId: project._id,
      designId,
      userId: req.user._id
    });

    res.json({
      message: 'Design saved to project successfully',
      imageUrl: newImageUrl
    });
  } catch (error) {
    logger.logError(error, { context: 'canva.projectSave', projectId: req.params.projectId, userId: req.user._id });
    res.status(500).json({ error: 'Error saving Canva design to project' });
  }
});

// POST /api/canva/projects/:projectId/create-new - Create a new design for a project
router.post('/projects/:projectId/create-new', authenticate, ensureCanvaToken, [
  body('title').optional().trim(),
  body('width').optional().isInt({ min: 40, max: 8000 }),
  body('height').optional().isInt({ min: 40, max: 8000 })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const project = await Project.findById(req.params.projectId);
    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    const { title, width, height } = req.body;

    const design = await canvaService.createDesign(req.canvaToken, {
      title: title || `Design for: ${project.campaignName || 'Project'}`,
      width: width || 1200,
      height: height || 1200
    });

    // Store design ID in project
    project.canvaDesignId = design.design?.id;
    await project.save();

    // Store active edit session for auto-save on return
    activeEditSessions.set(req.user._id.toString(), {
      projectId: project._id.toString(),
      designId: design.design?.id,
      userId: req.user._id.toString(),
      createdAt: Date.now(),
      expiresAt: Date.now() + 24 * 60 * 60 * 1000 // 24 hours
    });

    logger.info('New Canva design created for project', {
      projectId: project._id,
      designId: design.design?.id,
      userId: req.user._id
    });

    res.json({
      editUrl: design.design?.urls?.edit_url,
      viewUrl: design.design?.urls?.view_url,
      designId: design.design?.id,
      projectId: project._id.toString()
    });
  } catch (error) {
    logger.logError(error, { context: 'canva.projectCreateNew', projectId: req.params.projectId, userId: req.user._id });
    res.status(500).json({ error: 'Error creating new Canva design' });
  }
});

// GET /api/canva/projects/:projectId/design - Get current design for a project
router.get('/projects/:projectId/design', authenticate, ensureCanvaToken, async (req, res) => {
  try {
    const project = await Project.findById(req.params.projectId);
    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    if (!project.canvaDesignId) {
      return res.json({ design: null, message: 'No Canva design associated with this project' });
    }

    const design = await canvaService.getDesign(req.canvaToken, project.canvaDesignId);
    res.json({ design: design.design });
  } catch (error) {
    logger.logError(error, { context: 'canva.projectDesign', projectId: req.params.projectId, userId: req.user._id });
    res.status(500).json({ error: 'Error fetching project design' });
  }
});

// GET /api/canva/active-session - Get current user's active editing session
router.get('/active-session', authenticate, async (req, res) => {
  try {
    const session = activeEditSessions.get(req.user._id.toString());

    if (!session || session.expiresAt < Date.now()) {
      activeEditSessions.delete(req.user._id.toString());
      return res.json({ session: null });
    }

    res.json({ session });
  } catch (error) {
    logger.logError(error, { context: 'canva.activeSession', userId: req.user._id });
    res.status(500).json({ error: 'Error fetching active session' });
  }
});

// POST /api/canva/active-session/save - Auto-save the active editing session
router.post('/active-session/save', authenticate, ensureCanvaToken, async (req, res) => {
  try {
    const session = activeEditSessions.get(req.user._id.toString());

    if (!session || session.expiresAt < Date.now()) {
      activeEditSessions.delete(req.user._id.toString());
      return res.status(404).json({ error: 'No active editing session found' });
    }

    const { projectId, designId } = session;

    const project = await Project.findById(projectId);
    if (!project) {
      activeEditSessions.delete(req.user._id.toString());
      return res.status(404).json({ error: 'Project not found' });
    }

    // Create export job
    const exportResult = await canvaService.createExportJob(req.canvaToken, designId, 'png');

    // Poll for export completion
    const exportComplete = await canvaService.pollJobUntilComplete(
      req.canvaToken,
      exportResult.job.id,
      canvaService.getExportJob
    );

    const exportUrl = exportComplete.job.urls?.[0];

    if (!exportUrl) {
      throw new Error('Export completed but no URL returned');
    }

    // Download the exported image
    const imageResponse = await fetch(exportUrl);
    if (!imageResponse.ok) {
      throw new Error('Failed to download exported image');
    }
    const imageBuffer = Buffer.from(await imageResponse.arrayBuffer());

    // Upload to S3
    const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
    const s3Client = new S3Client({
      region: process.env.AWS_REGION,
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
      }
    });

    const key = `projects/${project._id}/canva-edited-${Date.now()}.png`;
    await s3Client.send(new PutObjectCommand({
      Bucket: process.env.AWS_S3_BUCKET,
      Key: key,
      Body: imageBuffer,
      ContentType: 'image/png'
    }));

    const newImageUrl = `https://${process.env.AWS_S3_BUCKET}.s3.${process.env.AWS_REGION}.amazonaws.com/${key}`;

    // Save current image to history before replacing
    if (project.imgDesign) {
      if (!project.imageHistory) {
        project.imageHistory = [];
      }
      project.imageHistory.unshift({
        url: project.imgDesign,
        source: project.canvaDesignId ? 'canva' : 'upload',
        canvaDesignId: project.canvaDesignId || null,
        createdAt: project.lastCanvaEdit || project.updatedAt,
        createdBy: req.user._id
      });
      // Keep only last 10 versions
      if (project.imageHistory.length > 10) {
        const removedImages = project.imageHistory.splice(10);
        for (const img of removedImages) {
          const oldKey = getKeyFromUrl(img.url);
          if (oldKey) {
            deleteFromS3(oldKey).catch(err => {
              logger.warn('Failed to delete old history image from S3', { key: oldKey });
            });
          }
        }
      }
    }

    // Update project with new image
    project.imgDesign = newImageUrl;
    project.canvaDesignId = designId;
    project.lastCanvaEdit = new Date();
    await project.save();

    // Clear the active session
    activeEditSessions.delete(req.user._id.toString());

    logger.info('Auto-saved Canva design to project', {
      projectId: project._id,
      designId,
      userId: req.user._id
    });

    res.json({
      success: true,
      projectId: project._id.toString(),
      imageUrl: newImageUrl
    });
  } catch (error) {
    logger.logError(error, { context: 'canva.autoSave', userId: req.user._id });
    res.status(500).json({ error: 'Error auto-saving design' });
  }
});

// DELETE /api/canva/active-session - Clear active editing session without saving
router.delete('/active-session', authenticate, async (req, res) => {
  try {
    activeEditSessions.delete(req.user._id.toString());
    res.json({ success: true });
  } catch (error) {
    logger.logError(error, { context: 'canva.clearSession', userId: req.user._id });
    res.status(500).json({ error: 'Error clearing session' });
  }
});

module.exports = router;
