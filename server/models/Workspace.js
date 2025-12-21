const mongoose = require('mongoose');

/**
 * Workspace Model
 *
 * The fundamental organizational boundary in the system.
 * Every piece of content, asset, and workflow exists within a workspace.
 *
 * Inspired by: Frappe CRM's multi-tenant architecture and Buffer's team workspaces
 */
const workspaceSchema = new mongoose.Schema({
  // === IDENTITY ===
  name: {
    type: String,
    required: [true, 'Workspace name is required'],
    trim: true,
    maxlength: [100, 'Name cannot exceed 100 characters']
  },
  slug: {
    type: String,
    unique: true,
    lowercase: true,
    trim: true
  },
  description: {
    type: String,
    maxlength: [500, 'Description cannot exceed 500 characters']
  },

  // === OWNERSHIP MODEL ===
  type: {
    type: String,
    enum: ['hybrid', 'team'],
    required: true,
    default: 'hybrid'
  },

  // For hybrid (solo marketer) workspaces
  owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },

  // For team workspaces
  team: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Team'
  },

  // === BRANDING ===
  branding: {
    logo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Asset'
    },
    primaryColor: {
      type: String,
      default: '#0d6efd'
    },
    secondaryColor: {
      type: String,
      default: '#6c757d'
    },
    favicon: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Asset'
    }
  },

  // === CONNECTED PLATFORMS ===
  platforms: [{
    platform: {
      type: String,
      enum: ['twitter', 'instagram', 'facebook', 'linkedin', 'tiktok', 'whatsapp', 'youtube', 'pinterest', 'threads', 'bluesky', 'custom'],
      required: true
    },
    enabled: {
      type: Boolean,
      default: true
    },
    connection: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'PlatformConnection'
    },
    // For custom platforms
    customName: String,
    customIcon: String
  }],

  // === WORKFLOW CONFIGURATION ===
  defaultWorkflow: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'WorkflowDefinition'
  },

  // Approval settings (primarily for team workspaces)
  approvalSettings: {
    requireApproval: {
      type: Boolean,
      default: function() {
        return this.type === 'team';
      }
    },
    approvalStages: [{
      stage: String,
      requiredApprovers: {
        type: Number,
        default: 1
      },
      approverRoles: [{
        type: String,
        enum: ['client', 'marketeer', 'designer', 'manager']
      }]
    }],
    autoApproveForRoles: [{
      type: String,
      enum: ['owner', 'manager']
    }]
  },

  // === SCHEDULING SETTINGS ===
  scheduling: {
    timezone: {
      type: String,
      default: 'UTC'
    },
    defaultPostingTimes: [{
      platform: String,
      times: [String] // ["09:00", "12:00", "18:00"]
    }],
    // Buffer-style queue settings
    queueEnabled: {
      type: Boolean,
      default: true
    },
    queueSlots: [{
      dayOfWeek: {
        type: Number,
        min: 0,
        max: 6
      },
      times: [String]
    }]
  },

  // === NOTIFICATIONS ===
  notifications: {
    emailNotifications: {
      type: Boolean,
      default: true
    },
    notifyOn: {
      contentApproved: { type: Boolean, default: true },
      contentRejected: { type: Boolean, default: true },
      contentPublished: { type: Boolean, default: true },
      contentFailed: { type: Boolean, default: true },
      newComment: { type: Boolean, default: true },
      assignedContent: { type: Boolean, default: true },
      upcomingDeadline: { type: Boolean, default: true }
    }
  },

  // === LIMITS & QUOTAS ===
  limits: {
    maxTeamMembers: {
      type: Number,
      default: 10
    },
    maxContentPerMonth: {
      type: Number,
      default: 1000
    },
    maxAssetStorage: {
      type: Number,
      default: 5368709120 // 5GB in bytes
    },
    currentAssetStorage: {
      type: Number,
      default: 0
    }
  },

  // === USAGE STATISTICS (Denormalized for performance) ===
  stats: {
    totalCampaigns: { type: Number, default: 0 },
    activeCampaigns: { type: Number, default: 0 },
    totalContent: { type: Number, default: 0 },
    publishedContent: { type: Number, default: 0 },
    totalAssets: { type: Number, default: 0 },
    totalLabels: { type: Number, default: 0 },
    lastActivityAt: Date
  },

  // === INTEGRATIONS ===
  integrations: {
    canva: {
      enabled: { type: Boolean, default: false },
      accessToken: String,
      refreshToken: String,
      tokenExpiresAt: Date,
      userId: String
    },
    googleDrive: {
      enabled: { type: Boolean, default: false },
      folderId: String
    },
    slack: {
      enabled: { type: Boolean, default: false },
      webhookUrl: String,
      channelId: String
    }
  },

  // === METADATA ===
  status: {
    type: String,
    enum: ['active', 'suspended', 'archived'],
    default: 'active'
  },

  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
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
workspaceSchema.index({ slug: 1 }, { unique: true });
workspaceSchema.index({ owner: 1 });
workspaceSchema.index({ team: 1 });
workspaceSchema.index({ status: 1 });
workspaceSchema.index({ 'platforms.platform': 1 });

// === PRE-SAVE HOOKS ===
workspaceSchema.pre('save', async function(next) {
  // Generate slug from name if not provided
  if (!this.slug) {
    const baseSlug = this.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');

    // Ensure uniqueness
    let slug = baseSlug;
    let counter = 1;
    while (await mongoose.models.Workspace.findOne({ slug, _id: { $ne: this._id } })) {
      slug = `${baseSlug}-${counter}`;
      counter++;
    }
    this.slug = slug;
  }

  next();
});

// === VIRTUALS ===
workspaceSchema.virtual('campaigns', {
  ref: 'Campaign',
  localField: '_id',
  foreignField: 'workspace'
});

workspaceSchema.virtual('content', {
  ref: 'Content',
  localField: '_id',
  foreignField: 'workspace'
});

workspaceSchema.virtual('assets', {
  ref: 'Asset',
  localField: '_id',
  foreignField: 'workspace'
});

workspaceSchema.virtual('storageUsedPercent').get(function() {
  if (!this.limits.maxAssetStorage) return 0;
  return Math.round((this.limits.currentAssetStorage / this.limits.maxAssetStorage) * 100);
});

// === INSTANCE METHODS ===

/**
 * Check if a user has access to this workspace
 */
workspaceSchema.methods.hasAccess = async function(userId, requiredRole = null) {
  // Owner always has access
  if (this.owner && this.owner.toString() === userId.toString()) {
    return true;
  }

  // Check team membership
  if (this.team) {
    const Team = mongoose.model('Team');
    const team = await Team.findById(this.team);
    if (team) {
      const member = team.members.find(m => m.user.toString() === userId.toString());
      if (member) {
        if (!requiredRole) return true;

        // Role hierarchy for access
        const roleHierarchy = {
          'viewer': 1,
          'contributor': 2,
          'designer': 3,
          'marketeer': 4,
          'manager': 5,
          'owner': 6
        };

        return roleHierarchy[member.role] >= roleHierarchy[requiredRole];
      }
    }
  }

  return false;
};

/**
 * Get user's role in this workspace
 */
workspaceSchema.methods.getUserRole = async function(userId) {
  if (this.owner && this.owner.toString() === userId.toString()) {
    return 'owner';
  }

  if (this.team) {
    const Team = mongoose.model('Team');
    const team = await Team.findById(this.team);
    if (team) {
      const member = team.members.find(m => m.user.toString() === userId.toString());
      if (member) return member.role;
    }
  }

  return null;
};

/**
 * Update usage statistics
 */
workspaceSchema.methods.updateStats = async function() {
  const Campaign = mongoose.model('Campaign');
  const Content = mongoose.model('Content');
  const Asset = mongoose.model('Asset');
  const Label = mongoose.model('Label');

  const [campaigns, activeCampaigns, content, publishedContent, assets, labels] = await Promise.all([
    Campaign.countDocuments({ workspace: this._id }),
    Campaign.countDocuments({ workspace: this._id, status: 'active' }),
    Content.countDocuments({ workspace: this._id, deletedAt: null }),
    Content.countDocuments({ workspace: this._id, stage: 'published', deletedAt: null }),
    Asset.countDocuments({ workspace: this._id, deletedAt: null }),
    Label.countDocuments({ workspace: this._id })
  ]);

  this.stats = {
    totalCampaigns: campaigns,
    activeCampaigns,
    totalContent: content,
    publishedContent,
    totalAssets: assets,
    totalLabels: labels,
    lastActivityAt: new Date()
  };

  await this.save();
};

/**
 * Check if workspace can add more content
 */
workspaceSchema.methods.canAddContent = async function() {
  if (!this.limits.maxContentPerMonth) return true;

  const Content = mongoose.model('Content');
  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  const contentThisMonth = await Content.countDocuments({
    workspace: this._id,
    createdAt: { $gte: startOfMonth }
  });

  return contentThisMonth < this.limits.maxContentPerMonth;
};

/**
 * Check if workspace can store more assets
 */
workspaceSchema.methods.canStoreAsset = function(sizeInBytes) {
  if (!this.limits.maxAssetStorage) return true;
  return (this.limits.currentAssetStorage + sizeInBytes) <= this.limits.maxAssetStorage;
};

/**
 * Get the next available queue slot for a platform
 */
workspaceSchema.methods.getNextQueueSlot = function(platform, afterDate = new Date()) {
  if (!this.scheduling.queueEnabled || !this.scheduling.queueSlots.length) {
    return null;
  }

  const slots = this.scheduling.queueSlots.sort((a, b) => {
    if (a.dayOfWeek !== b.dayOfWeek) return a.dayOfWeek - b.dayOfWeek;
    return a.times[0].localeCompare(b.times[0]);
  });

  let checkDate = new Date(afterDate);

  // Look up to 7 days ahead
  for (let dayOffset = 0; dayOffset < 7; dayOffset++) {
    const dayOfWeek = checkDate.getDay();
    const daySlots = slots.filter(s => s.dayOfWeek === dayOfWeek);

    for (const slot of daySlots) {
      for (const time of slot.times) {
        const [hours, minutes] = time.split(':').map(Number);
        const slotDate = new Date(checkDate);
        slotDate.setHours(hours, minutes, 0, 0);

        if (slotDate > afterDate) {
          return slotDate;
        }
      }
    }

    checkDate.setDate(checkDate.getDate() + 1);
    checkDate.setHours(0, 0, 0, 0);
  }

  return null;
};

// === STATIC METHODS ===

/**
 * Create a workspace for a hybrid (solo) user
 */
workspaceSchema.statics.createForHybridUser = async function(user, options = {}) {
  const WorkflowDefinition = mongoose.model('WorkflowDefinition');

  // Create default solo workflow
  const workflow = await WorkflowDefinition.createSoloPreset();

  const workspace = new this({
    name: options.name || `${user.firstName}'s Workspace`,
    type: 'hybrid',
    owner: user._id,
    defaultWorkflow: workflow._id,
    createdBy: user._id,
    approvalSettings: {
      requireApproval: false
    },
    ...options
  });

  await workspace.save();

  // Update workflow with workspace reference
  workflow.workspace = workspace._id;
  await workflow.save();

  return workspace;
};

/**
 * Create a workspace for a team
 */
workspaceSchema.statics.createForTeam = async function(team, createdBy, options = {}) {
  const WorkflowDefinition = mongoose.model('WorkflowDefinition');

  // Create default team workflow
  const workflow = await WorkflowDefinition.createTeamPreset();

  const workspace = new this({
    name: options.name || `${team.name} Workspace`,
    type: 'team',
    team: team._id,
    defaultWorkflow: workflow._id,
    createdBy: createdBy._id,
    approvalSettings: {
      requireApproval: true,
      approvalStages: [
        {
          stage: 'review',
          requiredApprovers: 1,
          approverRoles: ['client', 'manager']
        }
      ],
      autoApproveForRoles: ['owner', 'manager']
    },
    ...options
  });

  await workspace.save();

  // Update workflow with workspace reference
  workflow.workspace = workspace._id;
  await workflow.save();

  return workspace;
};

module.exports = mongoose.model('Workspace', workspaceSchema);
