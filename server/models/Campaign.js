const mongoose = require('mongoose');

/**
 * Campaign Model - Groups related content and assets
 * Extends the concept of the existing Project model
 * A campaign represents a marketing initiative with multiple content pieces
 */
const campaignSchema = new mongoose.Schema({
  // === WORKSPACE REFERENCE (Required) ===
  workspace: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Workspace',
    required: true,
    index: true
  },

  name: {
    type: String,
    required: true,
    trim: true,
    maxlength: 200
  },
  description: {
    type: String,
    default: '',
    maxlength: 2000
  },
  // Visual identification
  color: {
    type: String,
    default: '#0d6efd', // Bootstrap primary
    match: /^#[0-9A-Fa-f]{6}$/
  },
  coverImage: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Asset',
    default: null
  },

  // Campaign lifecycle
  status: {
    type: String,
    enum: ['draft', 'planning', 'active', 'paused', 'completed', 'archived'],
    default: 'draft',
    index: true
  },

  // Timeline
  startDate: {
    type: Date,
    index: true
  },
  endDate: {
    type: Date
  },

  // Team assignments - compatible with existing user roles
  owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  // Team members with roles
  team: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    role: {
      type: String,
      enum: ['owner', 'manager', 'designer', 'marketeer', 'contributor', 'viewer'],
      default: 'contributor'
    },
    addedAt: {
      type: Date,
      default: Date.now
    }
  }],

  // Client association (from existing Project model pattern)
  client: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    index: true
  },

  // Target platforms for this campaign
  platforms: [{
    type: String,
    enum: ['twitter', 'instagram', 'facebook', 'linkedin', 'tiktok', 'whatsapp', 'youtube', 'pinterest', 'threads', 'custom']
  }],

  // Custom platform configuration
  customPlatforms: [{
    name: { type: String, required: true },
    icon: { type: String, default: 'globe' },
    color: { type: String, default: '#6c757d' }
  }],

  // Organization
  labels: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Label'
  }],
  tags: [{
    type: String,
    trim: true,
    lowercase: true
  }],

  // Associated folder for assets
  folder: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Folder',
    default: null
  },

  // Goals and KPIs
  goals: [{
    metric: {
      type: String,
      enum: ['impressions', 'engagement', 'clicks', 'conversions', 'reach', 'followers', 'custom'],
      required: true
    },
    customMetricName: String,
    target: { type: Number, required: true },
    current: { type: Number, default: 0 },
    unit: { type: String, default: '' } // %, K, M, etc.
  }],

  // Budget tracking
  budget: {
    allocated: { type: Number, default: 0 },
    spent: { type: Number, default: 0 },
    currency: { type: String, default: 'USD' }
  },

  // Content counts (denormalized for quick access)
  contentCounts: {
    total: { type: Number, default: 0 },
    draft: { type: Number, default: 0 },
    scheduled: { type: Number, default: 0 },
    published: { type: Number, default: 0 }
  },

  // Settings
  settings: {
    autoArchiveAfterEnd: { type: Boolean, default: true },
    notifyTeamOnChanges: { type: Boolean, default: true },
    requireApproval: { type: Boolean, default: false },
    approvers: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }]
  },

  // Link to existing Project model for backwards compatibility
  legacyProjectId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Project',
    default: null
  },

  // Audit
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
}, {
  timestamps: true
});

// Indexes
campaignSchema.index({ owner: 1, status: 1 });
campaignSchema.index({ 'team.user': 1 });
campaignSchema.index({ client: 1, status: 1 });
campaignSchema.index({ startDate: 1, endDate: 1 });
campaignSchema.index({ name: 'text', description: 'text', tags: 'text' });

// Virtual for campaign duration in days
campaignSchema.virtual('durationDays').get(function() {
  if (this.startDate && this.endDate) {
    const diff = this.endDate - this.startDate;
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  }
  return null;
});

// Virtual for progress percentage
campaignSchema.virtual('progress').get(function() {
  if (!this.startDate || !this.endDate) return null;
  const now = new Date();
  if (now < this.startDate) return 0;
  if (now > this.endDate) return 100;
  const total = this.endDate - this.startDate;
  const elapsed = now - this.startDate;
  return Math.round((elapsed / total) * 100);
});

// Virtual for budget remaining
campaignSchema.virtual('budgetRemaining').get(function() {
  return this.budget.allocated - this.budget.spent;
});

// Check if user has access
campaignSchema.methods.hasAccess = function(userId, requiredRole = 'viewer') {
  const roleHierarchy = ['viewer', 'contributor', 'marketeer', 'designer', 'manager', 'owner'];
  const requiredLevel = roleHierarchy.indexOf(requiredRole);

  // Owner always has access
  if (this.owner.toString() === userId.toString()) return true;

  // Check team membership
  const teamMember = this.team.find(t => t.user.toString() === userId.toString());
  if (teamMember) {
    const memberLevel = roleHierarchy.indexOf(teamMember.role);
    return memberLevel >= requiredLevel;
  }

  return false;
};

// Get user's role in campaign
campaignSchema.methods.getUserRole = function(userId) {
  if (this.owner.toString() === userId.toString()) return 'owner';
  const teamMember = this.team.find(t => t.user.toString() === userId.toString());
  return teamMember ? teamMember.role : null;
};

// Add team member
campaignSchema.methods.addTeamMember = async function(userId, role = 'contributor') {
  const existing = this.team.find(t => t.user.toString() === userId.toString());
  if (existing) {
    existing.role = role;
  } else {
    this.team.push({ user: userId, role });
  }
  return this.save();
};

// Remove team member
campaignSchema.methods.removeTeamMember = async function(userId) {
  this.team = this.team.filter(t => t.user.toString() !== userId.toString());
  return this.save();
};

// Update content counts
campaignSchema.methods.updateContentCounts = async function() {
  const Content = mongoose.model('Content');
  const counts = await Content.aggregate([
    { $match: { campaign: this._id } },
    { $group: { _id: '$stage', count: { $sum: 1 } } }
  ]);

  this.contentCounts = {
    total: counts.reduce((sum, c) => sum + c.count, 0),
    draft: counts.find(c => ['idea', 'draft'].includes(c._id))?.count || 0,
    scheduled: counts.find(c => c._id === 'scheduled')?.count || 0,
    published: counts.find(c => c._id === 'published')?.count || 0
  };

  return this.save();
};

// Static: Get campaigns for user (owned + team member)
campaignSchema.statics.getForUser = async function(userId, options = {}) {
  const { status, page = 1, limit = 20 } = options;
  const query = {
    $or: [
      { owner: userId },
      { 'team.user': userId },
      { client: userId }
    ]
  };
  if (status) query.status = status;

  const [campaigns, total] = await Promise.all([
    this.find(query)
      .populate('owner', 'firstName lastName email')
      .populate('client', 'firstName lastName email')
      .populate('coverImage', 'thumbnailUrl s3Url')
      .sort({ updatedAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit),
    this.countDocuments(query)
  ]);

  return { campaigns, total, page, totalPages: Math.ceil(total / limit) };
};

campaignSchema.set('toJSON', { virtuals: true });

module.exports = mongoose.model('Campaign', campaignSchema);
