const express = require('express');
const { body, validationResult } = require('express-validator');
const Campaign = require('../models/Campaign');
const Content = require('../models/Content');
const Asset = require('../models/Asset');
const Folder = require('../models/Folder');
const { authenticate, authorize } = require('../middleware/auth');
const logger = require('../utils/logger');

const router = express.Router();

// Helper to check campaign access
const checkCampaignAccess = async (campaignId, userId, requiredRole = 'viewer') => {
  const campaign = await Campaign.findById(campaignId);
  if (!campaign) return { error: 'Campaign not found', status: 404 };
  if (!campaign.hasAccess(userId, requiredRole)) {
    return { error: 'Not authorized to access this campaign', status: 403 };
  }
  return { campaign };
};

// GET /api/campaigns - Get all campaigns for user
router.get('/', authenticate, async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      status,
      search,
      sortBy = 'updatedAt',
      sortOrder = 'desc'
    } = req.query;

    const result = await Campaign.getForUser(req.user._id, {
      status,
      page: parseInt(page),
      limit: parseInt(limit)
    });

    // Format response to match frontend expectations
    res.json({
      campaigns: result.campaigns,
      pagination: {
        page: result.page,
        pages: result.totalPages,
        total: result.total,
        limit: parseInt(limit)
      }
    });
  } catch (error) {
    logger.logError(error, { context: 'campaigns.getAll', userId: req.user._id });
    res.status(500).json({ error: 'Error fetching campaigns' });
  }
});

// GET /api/campaigns/stats - Get campaign statistics
router.get('/stats', authenticate, async (req, res) => {
  try {
    const userId = req.user._id;

    // Get campaign stats by status
    const stats = await Campaign.aggregate([
      {
        $match: {
          $or: [
            { owner: userId },
            { 'team.user': userId },
            { client: userId }
          ]
        }
      },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          totalContent: { $sum: '$contentCounts.total' }
        }
      }
    ]);

    // Build response in format frontend expects
    const result = {
      active: 0,
      completed: 0,
      planning: 0,
      paused: 0,
      draft: 0,
      archived: 0,
      totalContent: 0,
      total: 0
    };

    stats.forEach(s => {
      if (s._id) {
        result[s._id] = s.count;
        result.totalContent += s.totalContent || 0;
      }
      result.total += s.count;
    });

    res.json(result);
  } catch (error) {
    logger.logError(error, { context: 'campaigns.stats' });
    res.status(500).json({ error: 'Error fetching campaign stats' });
  }
});

// GET /api/campaigns/:id - Get single campaign with details
router.get('/:id', authenticate, async (req, res) => {
  try {
    const campaign = await Campaign.findById(req.params.id)
      .populate('owner', 'firstName lastName email role')
      .populate('client', 'firstName lastName email')
      .populate('team.user', 'firstName lastName email role')
      .populate('coverImage', 'thumbnailUrl s3Url')
      .populate('folder', 'name path')
      .populate('labels', 'name color')
      .populate('settings.approvers', 'firstName lastName email');

    if (!campaign) {
      return res.status(404).json({ error: 'Campaign not found' });
    }

    // Check access
    if (!campaign.hasAccess(req.user._id, 'viewer') && req.user.role !== 'system') {
      return res.status(403).json({ error: 'Not authorized to view this campaign' });
    }

    // Get content counts
    const contentStats = await Content.aggregate([
      { $match: { campaign: campaign._id, deletedAt: null } },
      { $group: { _id: '$stage', count: { $sum: 1 } } }
    ]);

    // Get recent content
    const recentContent = await Content.find({ campaign: campaign._id, deletedAt: null })
      .populate('createdBy', 'firstName lastName')
      .populate('primaryAsset', 'thumbnailUrl')
      .sort({ updatedAt: -1 })
      .limit(5);

    // Get asset count
    const assetCount = await Asset.countDocuments({
      campaigns: campaign._id,
      status: 'active'
    });

    res.json({
      campaign,
      contentStats: contentStats.reduce((acc, s) => { acc[s._id] = s.count; return acc; }, {}),
      recentContent,
      assetCount,
      userRole: campaign.getUserRole(req.user._id)
    });
  } catch (error) {
    logger.logError(error, { context: 'campaigns.getOne', campaignId: req.params.id });
    res.status(500).json({ error: 'Error fetching campaign' });
  }
});

// POST /api/campaigns - Create new campaign
router.post('/', authenticate, [
  body('name').trim().notEmpty().withMessage('Campaign name is required').isLength({ max: 200 }),
  body('description').optional().isLength({ max: 2000 }),
  body('color').optional().matches(/^#[0-9A-Fa-f]{6}$/),
  body('startDate').optional().isISO8601(),
  body('endDate').optional().isISO8601(),
  body('platforms').optional().isArray()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const {
      name, description, color, startDate, endDate,
      platforms, clientId, team, labels, tags,
      settings, customPlatforms
    } = req.body;

    // Validate dates
    if (startDate && endDate && new Date(startDate) > new Date(endDate)) {
      return res.status(400).json({ error: 'End date must be after start date' });
    }

    const campaign = new Campaign({
      name,
      description,
      color: color || '#0d6efd',
      startDate,
      endDate,
      platforms: platforms || [],
      customPlatforms: customPlatforms || [],
      client: clientId || null,
      owner: req.user._id,
      team: team || [],
      labels: labels || [],
      tags: tags || [],
      settings: settings || {},
      createdBy: req.user._id
    });

    await campaign.save();

    // Create associated folder for assets
    const folder = new Folder({
      name: `Campaign: ${name}`,
      type: 'campaign',
      campaign: campaign._id,
      createdBy: req.user._id
    });
    await folder.save();

    campaign.folder = folder._id;
    await campaign.save();

    await campaign.populate([
      { path: 'owner', select: 'firstName lastName email' },
      { path: 'client', select: 'firstName lastName email' },
      { path: 'folder', select: 'name path' }
    ]);

    logger.info('Campaign created', { campaignId: campaign._id, userId: req.user._id });
    res.status(201).json({ campaign });
  } catch (error) {
    logger.logError(error, { context: 'campaigns.create', userId: req.user._id });
    res.status(500).json({ error: 'Error creating campaign' });
  }
});

// PUT /api/campaigns/:id - Update campaign
router.put('/:id', authenticate, [
  body('name').optional().trim().isLength({ min: 1, max: 200 }),
  body('description').optional().isLength({ max: 2000 }),
  body('color').optional().matches(/^#[0-9A-Fa-f]{6}$/)
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { campaign, error, status } = await checkCampaignAccess(
      req.params.id, req.user._id, 'manager'
    );
    if (error) return res.status(status).json({ error });

    const allowedFields = [
      'name', 'description', 'color', 'status', 'startDate', 'endDate',
      'platforms', 'customPlatforms', 'labels', 'tags', 'goals', 'budget', 'settings'
    ];

    allowedFields.forEach(field => {
      if (req.body[field] !== undefined) {
        campaign[field] = req.body[field];
      }
    });

    // Handle client assignment
    if (req.body.clientId !== undefined) {
      campaign.client = req.body.clientId || null;
    }

    // Handle cover image
    if (req.body.coverImageId !== undefined) {
      campaign.coverImage = req.body.coverImageId || null;
    }

    await campaign.save();
    await campaign.populate([
      { path: 'owner', select: 'firstName lastName email' },
      { path: 'client', select: 'firstName lastName email' },
      { path: 'team.user', select: 'firstName lastName email' },
      { path: 'coverImage', select: 'thumbnailUrl s3Url' },
      { path: 'labels', select: 'name color' }
    ]);

    logger.info('Campaign updated', { campaignId: campaign._id, userId: req.user._id });
    res.json({ campaign });
  } catch (error) {
    logger.logError(error, { context: 'campaigns.update', campaignId: req.params.id });
    res.status(500).json({ error: 'Error updating campaign' });
  }
});

// POST /api/campaigns/:id/team - Add team member
router.post('/:id/team', authenticate, [
  body('userId').notEmpty().withMessage('User ID is required'),
  body('role').optional().isIn(['manager', 'designer', 'marketeer', 'contributor', 'viewer'])
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { campaign, error, status } = await checkCampaignAccess(
      req.params.id, req.user._id, 'manager'
    );
    if (error) return res.status(status).json({ error });

    const { userId, role } = req.body;
    await campaign.addTeamMember(userId, role || 'contributor');

    await campaign.populate('team.user', 'firstName lastName email role');

    logger.info('Team member added to campaign', { campaignId: campaign._id, addedUserId: userId });
    res.json({ team: campaign.team });
  } catch (error) {
    logger.logError(error, { context: 'campaigns.addTeamMember', campaignId: req.params.id });
    res.status(500).json({ error: 'Error adding team member' });
  }
});

// DELETE /api/campaigns/:id/team/:userId - Remove team member
router.delete('/:id/team/:userId', authenticate, async (req, res) => {
  try {
    const { campaign, error, status } = await checkCampaignAccess(
      req.params.id, req.user._id, 'manager'
    );
    if (error) return res.status(status).json({ error });

    await campaign.removeTeamMember(req.params.userId);

    logger.info('Team member removed from campaign', {
      campaignId: campaign._id,
      removedUserId: req.params.userId
    });
    res.json({ message: 'Team member removed', team: campaign.team });
  } catch (error) {
    logger.logError(error, { context: 'campaigns.removeTeamMember', campaignId: req.params.id });
    res.status(500).json({ error: 'Error removing team member' });
  }
});

// GET /api/campaigns/:id/content - Get all content for campaign
router.get('/:id/content', authenticate, async (req, res) => {
  try {
    const { campaign, error, status } = await checkCampaignAccess(
      req.params.id, req.user._id, 'viewer'
    );
    if (error) return res.status(status).json({ error });

    const { stage, page = 1, limit = 50 } = req.query;

    const query = { campaign: campaign._id, deletedAt: null };
    if (stage) query.stage = stage;

    const [content, total] = await Promise.all([
      Content.find(query)
        .populate('createdBy', 'firstName lastName email')
        .populate('assignedTo', 'firstName lastName email')
        .populate('primaryAsset', 'thumbnailUrl s3Url type')
        .populate('labels', 'name color')
        .sort({ updatedAt: -1 })
        .skip((parseInt(page) - 1) * parseInt(limit))
        .limit(parseInt(limit)),
      Content.countDocuments(query)
    ]);

    res.json({
      content,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    logger.logError(error, { context: 'campaigns.getContent', campaignId: req.params.id });
    res.status(500).json({ error: 'Error fetching campaign content' });
  }
});

// GET /api/campaigns/:id/assets - Get all assets for campaign
router.get('/:id/assets', authenticate, async (req, res) => {
  try {
    const { campaign, error, status } = await checkCampaignAccess(
      req.params.id, req.user._id, 'viewer'
    );
    if (error) return res.status(status).json({ error });

    const { type, page = 1, limit = 20 } = req.query;

    const query = { campaigns: campaign._id, status: 'active' };
    if (type) query.type = type;

    const [assets, total] = await Promise.all([
      Asset.find(query)
        .populate('uploadedBy', 'firstName lastName')
        .populate('labels', 'name color')
        .sort({ createdAt: -1 })
        .skip((parseInt(page) - 1) * parseInt(limit))
        .limit(parseInt(limit)),
      Asset.countDocuments(query)
    ]);

    res.json({
      assets,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    logger.logError(error, { context: 'campaigns.getAssets', campaignId: req.params.id });
    res.status(500).json({ error: 'Error fetching campaign assets' });
  }
});

// POST /api/campaigns/:id/archive - Archive campaign
router.post('/:id/archive', authenticate, async (req, res) => {
  try {
    const { campaign, error, status } = await checkCampaignAccess(
      req.params.id, req.user._id, 'manager'
    );
    if (error) return res.status(status).json({ error });

    campaign.status = 'archived';
    await campaign.save();

    logger.info('Campaign archived', { campaignId: campaign._id, userId: req.user._id });
    res.json({ message: 'Campaign archived', campaign });
  } catch (error) {
    logger.logError(error, { context: 'campaigns.archive', campaignId: req.params.id });
    res.status(500).json({ error: 'Error archiving campaign' });
  }
});

// DELETE /api/campaigns/:id - Delete campaign (soft delete by archiving)
router.delete('/:id', authenticate, async (req, res) => {
  try {
    const campaign = await Campaign.findById(req.params.id);

    if (!campaign) {
      return res.status(404).json({ error: 'Campaign not found' });
    }

    // Only owner or system can delete
    if (campaign.owner.toString() !== req.user._id.toString() && req.user.role !== 'system') {
      return res.status(403).json({ error: 'Not authorized to delete this campaign' });
    }

    // Archive instead of delete
    campaign.status = 'archived';
    await campaign.save();

    logger.info('Campaign deleted (archived)', { campaignId: campaign._id, userId: req.user._id });
    res.json({ message: 'Campaign deleted successfully' });
  } catch (error) {
    logger.logError(error, { context: 'campaigns.delete', campaignId: req.params.id });
    res.status(500).json({ error: 'Error deleting campaign' });
  }
});

module.exports = router;
