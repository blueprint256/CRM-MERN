const mongoose = require('mongoose');

/**
 * Activity Model
 *
 * Comprehensive audit trail and activity logging for all workspace actions.
 * Enables activity feeds, audit trails, and undo functionality.
 *
 * Inspired by: Frappe CRM's activity timeline and Gmail's activity log
 */
const activitySchema = new mongoose.Schema({
  // === CONTEXT ===
  workspace: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Workspace',
    required: true,
    index: true
  },

  // === ACTION DETAILS ===
  action: {
    type: String,
    required: true,
    enum: [
      // Content actions
      'content.created',
      'content.updated',
      'content.deleted',
      'content.restored',
      'content.stage_changed',
      'content.scheduled',
      'content.unscheduled',
      'content.published',
      'content.failed',
      'content.duplicated',
      'content.assigned',
      'content.unassigned',

      // Approval actions
      'approval.requested',
      'approval.approved',
      'approval.rejected',
      'approval.cancelled',

      // Comment actions
      'comment.added',
      'comment.edited',
      'comment.deleted',

      // Campaign actions
      'campaign.created',
      'campaign.updated',
      'campaign.deleted',
      'campaign.archived',
      'campaign.activated',
      'campaign.completed',
      'campaign.team_added',
      'campaign.team_removed',

      // Asset actions
      'asset.uploaded',
      'asset.updated',
      'asset.deleted',
      'asset.restored',
      'asset.moved',
      'asset.versioned',

      // Folder actions
      'folder.created',
      'folder.updated',
      'folder.deleted',
      'folder.moved',

      // Label actions
      'label.created',
      'label.updated',
      'label.deleted',
      'label.applied',
      'label.removed',

      // Team actions
      'team.member_added',
      'team.member_removed',
      'team.member_role_changed',
      'team.invitation_sent',
      'team.invitation_accepted',
      'team.invitation_cancelled',

      // Workspace actions
      'workspace.settings_updated',
      'workspace.platform_connected',
      'workspace.platform_disconnected',

      // Publishing actions
      'publish.started',
      'publish.completed',
      'publish.failed',
      'publish.retried',

      // System actions
      'system.auto_archive',
      'system.recurring_created',
      'system.workflow_triggered'
    ]
  },

  // Human-readable description
  description: {
    type: String,
    required: true
  },

  // === ACTOR ===
  actor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  actorType: {
    type: String,
    enum: ['user', 'system', 'webhook', 'scheduler'],
    default: 'user'
  },

  // === TARGET ENTITY ===
  targetType: {
    type: String,
    enum: ['content', 'campaign', 'asset', 'folder', 'label', 'team', 'workspace', 'user'],
    required: true
  },
  targetId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    index: true
  },
  targetName: String, // Denormalized for display

  // === SECONDARY TARGET (for relationships) ===
  secondaryTargetType: {
    type: String,
    enum: ['content', 'campaign', 'asset', 'folder', 'label', 'team', 'user', 'platform']
  },
  secondaryTargetId: mongoose.Schema.Types.ObjectId,
  secondaryTargetName: String,

  // === CHANGE DETAILS ===
  changes: [{
    field: String,
    fieldLabel: String,
    oldValue: mongoose.Schema.Types.Mixed,
    newValue: mongoose.Schema.Types.Mixed,
    displayOldValue: String,
    displayNewValue: String
  }],

  // === METADATA ===
  metadata: {
    // For stage changes
    fromStage: String,
    toStage: String,

    // For publishing
    platform: String,
    platformPostId: String,
    publishError: String,

    // For approvals
    approvalStatus: String,
    approvalNote: String,

    // For file operations
    fileSize: Number,
    filePath: String,

    // For team operations
    memberRole: String,
    memberEmail: String,

    // General
    ipAddress: String,
    userAgent: String,
    source: String // 'web', 'api', 'mobile', 'scheduler'
  },

  // === VISIBILITY ===
  visibility: {
    type: String,
    enum: ['all', 'team', 'managers', 'owner'],
    default: 'all'
  },

  // Is this a significant action (for highlights)?
  isSignificant: {
    type: Boolean,
    default: false
  },

  // === TIMESTAMPS ===
  createdAt: {
    type: Date,
    default: Date.now,
    index: true
  }
}, {
  timestamps: false,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// === INDEXES ===
activitySchema.index({ workspace: 1, createdAt: -1 });
activitySchema.index({ workspace: 1, targetType: 1, targetId: 1, createdAt: -1 });
activitySchema.index({ workspace: 1, action: 1, createdAt: -1 });
activitySchema.index({ actor: 1, createdAt: -1 });
activitySchema.index({ workspace: 1, isSignificant: 1, createdAt: -1 });

// TTL index - activities older than 1 year are automatically deleted
activitySchema.index({ createdAt: 1 }, { expireAfterSeconds: 365 * 24 * 60 * 60 });

// === VIRTUALS ===
activitySchema.virtual('actionCategory').get(function() {
  return this.action.split('.')[0];
});

activitySchema.virtual('actionVerb').get(function() {
  return this.action.split('.')[1];
});

// === STATIC METHODS ===

/**
 * Log a content action
 */
activitySchema.statics.logContent = async function(options) {
  const { workspace, actor, content, action, changes = [], metadata = {} } = options;

  const significantActions = ['content.published', 'content.failed', 'content.stage_changed'];

  return this.create({
    workspace,
    actor: actor?._id || actor,
    actorType: actor ? 'user' : 'system',
    action: `content.${action}`,
    description: this.generateDescription('content', action, content.title, actor),
    targetType: 'content',
    targetId: content._id,
    targetName: content.title,
    changes,
    metadata,
    isSignificant: significantActions.includes(`content.${action}`)
  });
};

/**
 * Log a campaign action
 */
activitySchema.statics.logCampaign = async function(options) {
  const { workspace, actor, campaign, action, changes = [], metadata = {} } = options;

  return this.create({
    workspace,
    actor: actor?._id || actor,
    actorType: actor ? 'user' : 'system',
    action: `campaign.${action}`,
    description: this.generateDescription('campaign', action, campaign.name, actor),
    targetType: 'campaign',
    targetId: campaign._id,
    targetName: campaign.name,
    changes,
    metadata,
    isSignificant: ['campaign.created', 'campaign.completed', 'campaign.archived'].includes(`campaign.${action}`)
  });
};

/**
 * Log an asset action
 */
activitySchema.statics.logAsset = async function(options) {
  const { workspace, actor, asset, action, changes = [], metadata = {} } = options;

  return this.create({
    workspace,
    actor: actor?._id || actor,
    actorType: actor ? 'user' : 'system',
    action: `asset.${action}`,
    description: this.generateDescription('asset', action, asset.originalName || asset.filename, actor),
    targetType: 'asset',
    targetId: asset._id,
    targetName: asset.originalName || asset.filename,
    changes,
    metadata: {
      ...metadata,
      fileSize: asset.size
    }
  });
};

/**
 * Log an approval action
 */
activitySchema.statics.logApproval = async function(options) {
  const { workspace, actor, content, action, status, note, metadata = {} } = options;

  return this.create({
    workspace,
    actor: actor?._id || actor,
    actorType: 'user',
    action: `approval.${action}`,
    description: this.generateApprovalDescription(action, content.title, actor, status),
    targetType: 'content',
    targetId: content._id,
    targetName: content.title,
    metadata: {
      ...metadata,
      approvalStatus: status,
      approvalNote: note
    },
    isSignificant: true
  });
};

/**
 * Log a team action
 */
activitySchema.statics.logTeam = async function(options) {
  const { workspace, actor, team, action, member, changes = [], metadata = {} } = options;

  return this.create({
    workspace,
    actor: actor?._id || actor,
    actorType: actor ? 'user' : 'system',
    action: `team.${action}`,
    description: this.generateTeamDescription(action, team.name, member, actor),
    targetType: 'team',
    targetId: team._id,
    targetName: team.name,
    secondaryTargetType: member ? 'user' : undefined,
    secondaryTargetId: member?.user || member,
    secondaryTargetName: member?.name,
    changes,
    metadata: {
      ...metadata,
      memberRole: member?.role,
      memberEmail: member?.email
    }
  });
};

/**
 * Log a publishing action
 */
activitySchema.statics.logPublish = async function(options) {
  const { workspace, content, action, platform, result, error } = options;

  return this.create({
    workspace,
    actorType: 'system',
    action: `publish.${action}`,
    description: this.generatePublishDescription(action, content.title, platform, error),
    targetType: 'content',
    targetId: content._id,
    targetName: content.title,
    metadata: {
      platform,
      platformPostId: result?.postId,
      publishError: error?.message
    },
    isSignificant: ['publish.completed', 'publish.failed'].includes(`publish.${action}`)
  });
};

/**
 * Generate human-readable description
 */
activitySchema.statics.generateDescription = function(entityType, action, entityName, actor) {
  const actorName = actor?.firstName || 'System';
  const truncatedName = entityName?.length > 50 ? entityName.substring(0, 50) + '...' : entityName;

  const descriptions = {
    created: `${actorName} created ${entityType} "${truncatedName}"`,
    updated: `${actorName} updated ${entityType} "${truncatedName}"`,
    deleted: `${actorName} deleted ${entityType} "${truncatedName}"`,
    restored: `${actorName} restored ${entityType} "${truncatedName}"`,
    stage_changed: `${actorName} moved "${truncatedName}" to a new stage`,
    scheduled: `${actorName} scheduled "${truncatedName}" for publishing`,
    unscheduled: `${actorName} unscheduled "${truncatedName}"`,
    published: `"${truncatedName}" was published`,
    failed: `Publishing failed for "${truncatedName}"`,
    duplicated: `${actorName} duplicated "${truncatedName}"`,
    assigned: `${actorName} assigned "${truncatedName}"`,
    unassigned: `${actorName} unassigned "${truncatedName}"`,
    uploaded: `${actorName} uploaded "${truncatedName}"`,
    moved: `${actorName} moved "${truncatedName}"`,
    versioned: `${actorName} created a new version of "${truncatedName}"`,
    archived: `${actorName} archived "${truncatedName}"`,
    activated: `${actorName} activated "${truncatedName}"`,
    completed: `"${truncatedName}" was marked as completed`
  };

  return descriptions[action] || `${actorName} performed ${action} on "${truncatedName}"`;
};

/**
 * Generate approval description
 */
activitySchema.statics.generateApprovalDescription = function(action, contentName, actor, status) {
  const actorName = actor?.firstName || 'Someone';
  const truncatedName = contentName?.length > 50 ? contentName.substring(0, 50) + '...' : contentName;

  const descriptions = {
    requested: `${actorName} requested approval for "${truncatedName}"`,
    approved: `${actorName} approved "${truncatedName}"`,
    rejected: `${actorName} rejected "${truncatedName}"`,
    cancelled: `${actorName} cancelled approval request for "${truncatedName}"`
  };

  return descriptions[action] || `Approval ${action} for "${truncatedName}"`;
};

/**
 * Generate team description
 */
activitySchema.statics.generateTeamDescription = function(action, teamName, member, actor) {
  const actorName = actor?.firstName || 'System';
  const memberName = member?.name || member?.email || 'a member';

  const descriptions = {
    member_added: `${actorName} added ${memberName} to ${teamName}`,
    member_removed: `${actorName} removed ${memberName} from ${teamName}`,
    member_role_changed: `${actorName} changed ${memberName}'s role in ${teamName}`,
    invitation_sent: `${actorName} invited ${memberName} to ${teamName}`,
    invitation_accepted: `${memberName} joined ${teamName}`,
    invitation_cancelled: `${actorName} cancelled invitation for ${memberName}`
  };

  return descriptions[action] || `Team action: ${action}`;
};

/**
 * Generate publish description
 */
activitySchema.statics.generatePublishDescription = function(action, contentName, platform, error) {
  const truncatedName = contentName?.length > 50 ? contentName.substring(0, 50) + '...' : contentName;

  const descriptions = {
    started: `Started publishing "${truncatedName}" to ${platform}`,
    completed: `"${truncatedName}" published successfully to ${platform}`,
    failed: `Failed to publish "${truncatedName}" to ${platform}: ${error?.message || 'Unknown error'}`,
    retried: `Retrying to publish "${truncatedName}" to ${platform}`
  };

  return descriptions[action] || `Publishing ${action} for "${truncatedName}"`;
};

/**
 * Get activity feed for a workspace
 */
activitySchema.statics.getFeed = async function(workspaceId, options = {}) {
  const {
    limit = 50,
    before,
    after,
    targetType,
    targetId,
    actions,
    actorId,
    significantOnly = false
  } = options;

  const query = { workspace: workspaceId };

  if (before) query.createdAt = { $lt: new Date(before) };
  if (after) query.createdAt = { ...query.createdAt, $gt: new Date(after) };
  if (targetType) query.targetType = targetType;
  if (targetId) query.targetId = targetId;
  if (actions) query.action = { $in: actions };
  if (actorId) query.actor = actorId;
  if (significantOnly) query.isSignificant = true;

  return this.find(query)
    .sort({ createdAt: -1 })
    .limit(limit)
    .populate('actor', 'firstName lastName email profilePicture')
    .lean();
};

/**
 * Get activity for a specific entity
 */
activitySchema.statics.getForEntity = async function(targetType, targetId, options = {}) {
  const { limit = 20, before } = options;

  const query = { targetType, targetId };
  if (before) query.createdAt = { $lt: new Date(before) };

  return this.find(query)
    .sort({ createdAt: -1 })
    .limit(limit)
    .populate('actor', 'firstName lastName email profilePicture')
    .lean();
};

module.exports = mongoose.model('Activity', activitySchema);
