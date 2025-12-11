const crypto = require('crypto');
const logger = require('../utils/logger');

const CANVA_API_BASE = 'https://api.canva.com/rest/v1';
const CANVA_AUTH_URL = 'https://www.canva.com/api/oauth/authorize';
const CANVA_TOKEN_URL = 'https://www.canva.com/api/oauth/token';

// Required scopes for full functionality
const CANVA_SCOPES = [
  'asset:read',
  'asset:write',
  'design:content:read',
  'design:content:write',
  'design:meta:read',
  'profile:read'
].join(' ');

/**
 * Generate a cryptographically random code verifier for PKCE
 */
const generateCodeVerifier = () => {
  return crypto.randomBytes(32).toString('base64url');
};

/**
 * Generate code challenge from code verifier using SHA-256
 */
const generateCodeChallenge = (codeVerifier) => {
  return crypto
    .createHash('sha256')
    .update(codeVerifier)
    .digest('base64url');
};

/**
 * Generate a random state parameter for CSRF protection
 */
const generateState = () => {
  return crypto.randomBytes(16).toString('hex');
};

/**
 * Build the Canva OAuth authorization URL
 */
const buildAuthorizationUrl = (codeChallenge, state) => {
  // Log configuration for debugging
  logger.info('Building Canva authorization URL', {
    clientId: process.env.CANVA_CLIENT_ID ? `${process.env.CANVA_CLIENT_ID.substring(0, 10)}...` : 'NOT SET',
    redirectUri: process.env.CANVA_REDIRECT_URI || 'NOT SET',
    scopes: CANVA_SCOPES
  });

  if (!process.env.CANVA_CLIENT_ID) {
    throw new Error('CANVA_CLIENT_ID is not configured');
  }
  if (!process.env.CANVA_REDIRECT_URI) {
    throw new Error('CANVA_REDIRECT_URI is not configured');
  }

  const params = new URLSearchParams({
    response_type: 'code',
    client_id: process.env.CANVA_CLIENT_ID,
    redirect_uri: process.env.CANVA_REDIRECT_URI,
    scope: CANVA_SCOPES,
    code_challenge: codeChallenge,
    code_challenge_method: 'S256',
    state: state
  });

  const authUrl = `${CANVA_AUTH_URL}?${params.toString()}`;
  logger.debug('Generated Canva auth URL', { authUrl });

  return authUrl;
};

/**
 * Exchange authorization code for access tokens
 */
const exchangeCodeForTokens = async (code, codeVerifier) => {
  try {
    const credentials = Buffer.from(
      `${process.env.CANVA_CLIENT_ID}:${process.env.CANVA_CLIENT_SECRET}`
    ).toString('base64');

    const response = await fetch(CANVA_TOKEN_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${credentials}`,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code: code,
        code_verifier: codeVerifier,
        redirect_uri: process.env.CANVA_REDIRECT_URI
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      logger.error('Canva token exchange failed', { error: errorData });
      throw new Error(errorData.error_description || 'Token exchange failed');
    }

    const tokens = await response.json();
    logger.info('Canva tokens obtained successfully');
    return tokens;
  } catch (error) {
    logger.logError(error, { context: 'canva.exchangeCodeForTokens' });
    throw error;
  }
};

/**
 * Refresh access token using refresh token
 */
const refreshAccessToken = async (refreshToken) => {
  try {
    const credentials = Buffer.from(
      `${process.env.CANVA_CLIENT_ID}:${process.env.CANVA_CLIENT_SECRET}`
    ).toString('base64');

    const response = await fetch(CANVA_TOKEN_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${credentials}`,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: refreshToken
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      logger.error('Canva token refresh failed', { error: errorData });
      throw new Error(errorData.error_description || 'Token refresh failed');
    }

    const tokens = await response.json();
    logger.info('Canva tokens refreshed successfully');
    return tokens;
  } catch (error) {
    logger.logError(error, { context: 'canva.refreshAccessToken' });
    throw error;
  }
};

/**
 * Make authenticated request to Canva API
 */
const canvaApiRequest = async (endpoint, options = {}, accessToken) => {
  const url = `${CANVA_API_BASE}${endpoint}`;

  const response = await fetch(url, {
    ...options,
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      ...options.headers
    }
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    logger.error('Canva API request failed', {
      endpoint,
      status: response.status,
      error: errorData
    });
    throw new Error(errorData.message || `Canva API error: ${response.status}`);
  }

  return response.json();
};

/**
 * Get user profile from Canva
 */
const getUserProfile = async (accessToken) => {
  try {
    const response = await canvaApiRequest('/users/me', {}, accessToken);
    logger.info('Canva user profile retrieved');
    return response;
  } catch (error) {
    logger.logError(error, { context: 'canva.getUserProfile' });
    throw error;
  }
};

/**
 * Upload an image asset to Canva
 */
const uploadAsset = async (accessToken, imageBuffer, fileName) => {
  try {
    const nameBase64 = Buffer.from(fileName.substring(0, 50)).toString('base64');

    const response = await fetch(`${CANVA_API_BASE}/asset-uploads`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/octet-stream',
        'Asset-Upload-Metadata': JSON.stringify({ name_base64: nameBase64 })
      },
      body: imageBuffer
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      logger.error('Canva asset upload failed', { error: errorData });
      throw new Error(errorData.message || 'Asset upload failed');
    }

    const result = await response.json();
    logger.info('Canva asset upload initiated', { jobId: result.job?.id });
    return result;
  } catch (error) {
    logger.logError(error, { context: 'canva.uploadAsset' });
    throw error;
  }
};

/**
 * Get asset upload job status
 */
const getAssetUploadJob = async (accessToken, jobId) => {
  try {
    const response = await canvaApiRequest(`/asset-uploads/${jobId}`, {}, accessToken);
    return response;
  } catch (error) {
    logger.logError(error, { context: 'canva.getAssetUploadJob', jobId });
    throw error;
  }
};

/**
 * Create a new design in Canva
 */
const createDesign = async (accessToken, options = {}) => {
  try {
    const { title, assetId, width, height } = options;

    const body = {
      design_type: width && height
        ? { type: 'custom', width, height }
        : { type: 'preset', name: 'doc' }
    };

    if (title) body.title = title;
    if (assetId) body.asset_id = assetId;

    const response = await canvaApiRequest('/designs', {
      method: 'POST',
      body: JSON.stringify(body)
    }, accessToken);

    logger.info('Canva design created', { designId: response.design?.id });
    return response;
  } catch (error) {
    logger.logError(error, { context: 'canva.createDesign' });
    throw error;
  }
};

/**
 * Get design metadata
 */
const getDesign = async (accessToken, designId) => {
  try {
    const response = await canvaApiRequest(`/designs/${designId}`, {}, accessToken);
    return response;
  } catch (error) {
    logger.logError(error, { context: 'canva.getDesign', designId });
    throw error;
  }
};

/**
 * List user's designs
 */
const listDesigns = async (accessToken, options = {}) => {
  try {
    const params = new URLSearchParams();
    if (options.limit) params.append('limit', options.limit);
    if (options.continuation) params.append('continuation', options.continuation);

    const endpoint = `/designs${params.toString() ? '?' + params.toString() : ''}`;
    const response = await canvaApiRequest(endpoint, {}, accessToken);
    return response;
  } catch (error) {
    logger.logError(error, { context: 'canva.listDesigns' });
    throw error;
  }
};

/**
 * Create an export job for a design
 */
const createExportJob = async (accessToken, designId, format = 'png') => {
  try {
    const formatConfig = {
      png: { type: 'png', lossless: false },
      jpg: { type: 'jpg', quality: 90 },
      pdf: { type: 'pdf' }
    };

    const body = {
      design_id: designId,
      format: formatConfig[format] || formatConfig.png
    };

    const response = await canvaApiRequest('/exports', {
      method: 'POST',
      body: JSON.stringify(body)
    }, accessToken);

    logger.info('Canva export job created', { jobId: response.job?.id });
    return response;
  } catch (error) {
    logger.logError(error, { context: 'canva.createExportJob', designId });
    throw error;
  }
};

/**
 * Get export job status
 */
const getExportJob = async (accessToken, jobId) => {
  try {
    const response = await canvaApiRequest(`/exports/${jobId}`, {}, accessToken);
    return response;
  } catch (error) {
    logger.logError(error, { context: 'canva.getExportJob', jobId });
    throw error;
  }
};

/**
 * Poll job until completion
 */
const pollJobUntilComplete = async (accessToken, jobId, getJobFn, maxAttempts = 30, intervalMs = 2000) => {
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const result = await getJobFn(accessToken, jobId);

    if (result.job?.status === 'success') {
      return result;
    }

    if (result.job?.status === 'failed') {
      throw new Error(result.job.error?.message || 'Job failed');
    }

    // Wait before next poll
    await new Promise(resolve => setTimeout(resolve, intervalMs));
  }

  throw new Error('Job polling timeout');
};

module.exports = {
  generateCodeVerifier,
  generateCodeChallenge,
  generateState,
  buildAuthorizationUrl,
  exchangeCodeForTokens,
  refreshAccessToken,
  getUserProfile,
  uploadAsset,
  getAssetUploadJob,
  createDesign,
  getDesign,
  listDesigns,
  createExportJob,
  getExportJob,
  pollJobUntilComplete,
  CANVA_SCOPES
};
