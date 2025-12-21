const mongoose = require('mongoose');

/**
 * PlatformConnection Model
 *
 * Manages OAuth connections to social media platforms.
 * Stores tokens, handles refresh, and tracks connection health.
 *
 * Inspired by: Buffer's platform connections and Frappe's integration architecture
 */
const platformConnectionSchema = new mongoose.Schema({
  // === WORKSPACE REFERENCE ===
  workspace: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Workspace',
    required: true,
    index: true
  },

  // === PLATFORM IDENTITY ===
  platform: {
    type: String,
    required: true,
    enum: [
      'twitter',
      'instagram',
      'facebook',
      'linkedin',
      'tiktok',
      'whatsapp',
      'youtube',
      'pinterest',
      'threads',
      'bluesky',
      'mastodon',
      'custom'
    ]
  },

  // For custom platforms
  customPlatform: {
    name: String,
    apiBaseUrl: String,
    authType: {
      type: String,
      enum: ['oauth2', 'api_key', 'basic']
    }
  },

  // === ACCOUNT DETAILS ===
  account: {
    id: {
      type: String,
      required: true
    },
    username: String,
    displayName: String,
    profileUrl: String,
    profileImageUrl: String,
    email: String,
    // Platform-specific account type
    accountType: {
      type: String,
      enum: ['personal', 'business', 'creator', 'page', 'group']
    },
    // Followers/subscribers count (cached)
    followersCount: Number,
    // Is this a verified account?
    isVerified: Boolean
  },

  // === OAUTH TOKENS ===
  tokens: {
    accessToken: {
      type: String,
      required: true
    },
    refreshToken: String,
    tokenType: {
      type: String,
      default: 'Bearer'
    },
    expiresAt: Date,
    refreshExpiresAt: Date,
    scope: [String],
    // For platforms that return additional tokens
    additionalTokens: mongoose.Schema.Types.Mixed
  },

  // === CONNECTION STATUS ===
  status: {
    type: String,
    enum: ['active', 'expired', 'revoked', 'error', 'pending'],
    default: 'active'
  },

  // Health check results
  health: {
    lastCheck: Date,
    isHealthy: {
      type: Boolean,
      default: true
    },
    lastError: String,
    errorCount: {
      type: Number,
      default: 0
    },
    consecutiveErrors: {
      type: Number,
      default: 0
    }
  },

  // === PERMISSIONS ===
  permissions: {
    canPost: { type: Boolean, default: true },
    canSchedule: { type: Boolean, default: true },
    canReadAnalytics: { type: Boolean, default: true },
    canReadMessages: { type: Boolean, default: false },
    canReadComments: { type: Boolean, default: true },
    canReply: { type: Boolean, default: false },
    // Platform-specific permissions
    grantedScopes: [String]
  },

  // === PLATFORM-SPECIFIC SETTINGS ===
  settings: {
    // Default posting settings
    defaultVisibility: {
      type: String,
      enum: ['public', 'private', 'followers', 'connections']
    },

    // Timezone for this account
    timezone: String,

    // Rate limiting awareness
    rateLimit: {
      postsPerDay: Number,
      postsPerHour: Number,
      currentDayPosts: { type: Number, default: 0 },
      currentHourPosts: { type: Number, default: 0 },
      lastReset: Date
    },

    // Feature flags (what this account can do)
    features: {
      supportsThreads: { type: Boolean, default: false },
      supportsStories: { type: Boolean, default: false },
      supportsReels: { type: Boolean, default: false },
      supportsPolls: { type: Boolean, default: false },
      supportsScheduling: { type: Boolean, default: true },
      supportsCarousel: { type: Boolean, default: false },
      supportsVideo: { type: Boolean, default: true },
      maxMediaCount: { type: Number, default: 4 },
      maxCharacters: Number,
      maxVideoLength: Number // seconds
    },

    // Notification preferences for this connection
    notifications: {
      onPublishSuccess: { type: Boolean, default: true },
      onPublishFail: { type: Boolean, default: true },
      onTokenExpiry: { type: Boolean, default: true }
    }
  },

  // === USAGE STATISTICS ===
  stats: {
    totalPosts: { type: Number, default: 0 },
    successfulPosts: { type: Number, default: 0 },
    failedPosts: { type: Number, default: 0 },
    lastPostAt: Date,
    lastSuccessAt: Date,
    lastFailAt: Date
  },

  // === METADATA ===
  connectedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },

  connectedAt: {
    type: Date,
    default: Date.now
  },

  lastTokenRefresh: Date,

  // Notes for team reference
  notes: String,

  // Is this the primary account for this platform in the workspace?
  isPrimary: {
    type: Boolean,
    default: false
  },

  createdAt: {
    type: Date,
    default: Date.now
  },

  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// === INDEXES ===
platformConnectionSchema.index({ workspace: 1, platform: 1 });
platformConnectionSchema.index({ workspace: 1, status: 1 });
platformConnectionSchema.index({ 'account.id': 1, platform: 1 });
platformConnectionSchema.index({ 'tokens.expiresAt': 1 });
platformConnectionSchema.index({ status: 1, 'health.lastCheck': 1 });

// === VIRTUALS ===
platformConnectionSchema.virtual('isTokenExpired').get(function() {
  if (!this.tokens.expiresAt) return false;
  return new Date() > this.tokens.expiresAt;
});

platformConnectionSchema.virtual('tokenExpiresIn').get(function() {
  if (!this.tokens.expiresAt) return null;
  return Math.max(0, this.tokens.expiresAt - new Date());
});

platformConnectionSchema.virtual('needsRefresh').get(function() {
  if (!this.tokens.expiresAt) return false;
  // Refresh if expires in less than 10 minutes
  const tenMinutes = 10 * 60 * 1000;
  return (this.tokens.expiresAt - new Date()) < tenMinutes;
});

// === INSTANCE METHODS ===

/**
 * Update tokens after refresh
 */
platformConnectionSchema.methods.updateTokens = async function(newTokens) {
  this.tokens.accessToken = newTokens.access_token || newTokens.accessToken;

  if (newTokens.refresh_token || newTokens.refreshToken) {
    this.tokens.refreshToken = newTokens.refresh_token || newTokens.refreshToken;
  }

  if (newTokens.expires_in || newTokens.expiresIn) {
    const expiresIn = newTokens.expires_in || newTokens.expiresIn;
    this.tokens.expiresAt = new Date(Date.now() + expiresIn * 1000);
  }

  if (newTokens.scope) {
    this.tokens.scope = Array.isArray(newTokens.scope)
      ? newTokens.scope
      : newTokens.scope.split(' ');
  }

  this.lastTokenRefresh = new Date();
  this.status = 'active';
  this.health.isHealthy = true;
  this.health.consecutiveErrors = 0;

  await this.save();
  return this;
};

/**
 * Mark connection as having an error
 */
platformConnectionSchema.methods.recordError = async function(error) {
  this.health.lastCheck = new Date();
  this.health.lastError = error.message || String(error);
  this.health.errorCount += 1;
  this.health.consecutiveErrors += 1;
  this.health.isHealthy = false;

  // If too many consecutive errors, mark as error status
  if (this.health.consecutiveErrors >= 5) {
    this.status = 'error';
  }

  await this.save();
  return this;
};

/**
 * Mark connection as healthy
 */
platformConnectionSchema.methods.recordSuccess = async function() {
  this.health.lastCheck = new Date();
  this.health.isHealthy = true;
  this.health.consecutiveErrors = 0;
  this.status = 'active';

  await this.save();
  return this;
};

/**
 * Record a post attempt
 */
platformConnectionSchema.methods.recordPost = async function(success, postId = null) {
  this.stats.totalPosts += 1;
  this.stats.lastPostAt = new Date();

  if (success) {
    this.stats.successfulPosts += 1;
    this.stats.lastSuccessAt = new Date();
    this.health.consecutiveErrors = 0;
    this.health.isHealthy = true;
  } else {
    this.stats.failedPosts += 1;
    this.stats.lastFailAt = new Date();
    this.health.consecutiveErrors += 1;
  }

  // Update rate limit counters
  const now = new Date();
  const hourAgo = new Date(now - 60 * 60 * 1000);
  const dayStart = new Date(now.setHours(0, 0, 0, 0));

  if (!this.settings.rateLimit.lastReset || this.settings.rateLimit.lastReset < dayStart) {
    this.settings.rateLimit.currentDayPosts = 0;
    this.settings.rateLimit.currentHourPosts = 0;
    this.settings.rateLimit.lastReset = now;
  }

  this.settings.rateLimit.currentDayPosts += 1;
  this.settings.rateLimit.currentHourPosts += 1;

  await this.save();
  return this;
};

/**
 * Check if we can post (rate limiting)
 */
platformConnectionSchema.methods.canPost = function() {
  const { rateLimit } = this.settings;

  if (rateLimit.postsPerDay && rateLimit.currentDayPosts >= rateLimit.postsPerDay) {
    return { allowed: false, reason: 'Daily post limit reached' };
  }

  if (rateLimit.postsPerHour && rateLimit.currentHourPosts >= rateLimit.postsPerHour) {
    return { allowed: false, reason: 'Hourly post limit reached' };
  }

  if (this.status !== 'active') {
    return { allowed: false, reason: `Connection status is ${this.status}` };
  }

  if (this.isTokenExpired) {
    return { allowed: false, reason: 'Token has expired' };
  }

  return { allowed: true };
};

/**
 * Revoke the connection
 */
platformConnectionSchema.methods.revoke = async function() {
  this.status = 'revoked';
  this.tokens.accessToken = null;
  this.tokens.refreshToken = null;

  await this.save();
  return this;
};

/**
 * Get display information for UI
 */
platformConnectionSchema.methods.getDisplayInfo = function() {
  return {
    id: this._id,
    platform: this.platform,
    account: {
      username: this.account.username,
      displayName: this.account.displayName,
      profileImageUrl: this.account.profileImageUrl,
      accountType: this.account.accountType,
      isVerified: this.account.isVerified
    },
    status: this.status,
    isHealthy: this.health.isHealthy,
    isPrimary: this.isPrimary,
    stats: this.stats,
    features: this.settings.features
  };
};

// === STATIC METHODS ===

/**
 * Find active connections for a workspace
 */
platformConnectionSchema.statics.findActiveForWorkspace = async function(workspaceId) {
  return this.find({
    workspace: workspaceId,
    status: 'active'
  }).sort({ isPrimary: -1, connectedAt: 1 });
};

/**
 * Find connections that need token refresh
 */
platformConnectionSchema.statics.findNeedingRefresh = async function() {
  const tenMinutes = 10 * 60 * 1000;
  const threshold = new Date(Date.now() + tenMinutes);

  return this.find({
    status: 'active',
    'tokens.expiresAt': { $lt: threshold },
    'tokens.refreshToken': { $exists: true, $ne: null }
  });
};

/**
 * Find connections needing health check
 */
platformConnectionSchema.statics.findNeedingHealthCheck = async function() {
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);

  return this.find({
    status: 'active',
    $or: [
      { 'health.lastCheck': { $lt: oneHourAgo } },
      { 'health.lastCheck': { $exists: false } }
    ]
  });
};

/**
 * Get platform features/limits
 */
platformConnectionSchema.statics.getPlatformDefaults = function(platform) {
  const defaults = {
    twitter: {
      maxCharacters: 280,
      maxMediaCount: 4,
      supportsThreads: true,
      supportsPolls: true,
      supportsScheduling: true,
      maxVideoLength: 140
    },
    instagram: {
      maxCharacters: 2200,
      maxMediaCount: 10,
      supportsStories: true,
      supportsReels: true,
      supportsCarousel: true,
      supportsScheduling: true,
      maxVideoLength: 60
    },
    facebook: {
      maxCharacters: 63206,
      maxMediaCount: 10,
      supportsStories: true,
      supportsScheduling: true,
      maxVideoLength: 240
    },
    linkedin: {
      maxCharacters: 3000,
      maxMediaCount: 9,
      supportsScheduling: true,
      maxVideoLength: 600
    },
    tiktok: {
      maxCharacters: 2200,
      maxMediaCount: 1,
      supportsVideo: true,
      supportsScheduling: true,
      maxVideoLength: 180
    },
    youtube: {
      maxCharacters: 5000,
      maxMediaCount: 1,
      supportsVideo: true,
      supportsScheduling: true,
      maxVideoLength: 43200 // 12 hours
    },
    whatsapp: {
      maxCharacters: 4096,
      maxMediaCount: 1,
      supportsScheduling: false
    },
    pinterest: {
      maxCharacters: 500,
      maxMediaCount: 5,
      supportsScheduling: true
    },
    threads: {
      maxCharacters: 500,
      maxMediaCount: 10,
      supportsCarousel: true,
      supportsScheduling: true
    },
    bluesky: {
      maxCharacters: 300,
      maxMediaCount: 4,
      supportsScheduling: true
    }
  };

  return defaults[platform] || {};
};

module.exports = mongoose.model('PlatformConnection', platformConnectionSchema);
