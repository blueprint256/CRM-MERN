const mongoose = require('mongoose');

/**
 * Content Model - Unified marketing content item
 * Represents any piece of content from idea to published
 * Supports multi-platform variants and recurring content
 */

// Platform-specific content schemas
const twitterVariantSchema = new mongoose.Schema({
  text: { type: String, maxlength: 280 },
  isThread: { type: Boolean, default: false },
  threadParts: [{
    text: { type: String, maxlength: 280 },
    mediaIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Asset' }]
  }],
  mediaIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Asset' }],
  pollOptions: [{ type: String, maxlength: 25 }],
  pollDuration: { type: Number, default: 1440 } // minutes
}, { _id: false });

const instagramVariantSchema = new mongoose.Schema({
  caption: { type: String, maxlength: 2200 },
  mediaType: {
    type: String,
    enum: ['image', 'video', 'carousel', 'reel', 'story'],
    default: 'image'
  },
  mediaIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Asset' }],
  location: { type: String },
  altText: { type: String, maxlength: 100 },
  coverImageId: { type: mongoose.Schema.Types.ObjectId, ref: 'Asset' } // For reels
}, { _id: false });

const whatsappVariantSchema = new mongoose.Schema({
  message: { type: String, maxlength: 4096 },
  mediaId: { type: mongoose.Schema.Types.ObjectId, ref: 'Asset' },
  buttons: [{
    type: { type: String, enum: ['url', 'call', 'quick_reply'] },
    text: { type: String, maxlength: 20 },
    value: { type: String }
  }],
  listSections: [{
    title: String,
    rows: [{
      title: { type: String, maxlength: 24 },
      description: { type: String, maxlength: 72 }
    }]
  }]
}, { _id: false });

const tiktokVariantSchema = new mongoose.Schema({
  caption: { type: String, maxlength: 2200 },
  videoId: { type: mongoose.Schema.Types.ObjectId, ref: 'Asset' },
  soundId: { type: String },
  soundName: { type: String },
  duetEnabled: { type: Boolean, default: true },
  stitchEnabled: { type: Boolean, default: true },
  commentEnabled: { type: Boolean, default: true }
}, { _id: false });

const linkedinVariantSchema = new mongoose.Schema({
  text: { type: String, maxlength: 3000 },
  mediaIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Asset' }],
  articleTitle: { type: String },
  articleUrl: { type: String },
  visibility: {
    type: String,
    enum: ['public', 'connections', 'logged_in'],
    default: 'public'
  }
}, { _id: false });

const facebookVariantSchema = new mongoose.Schema({
  text: { type: String, maxlength: 63206 },
  mediaIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Asset' }],
  link: { type: String },
  linkTitle: { type: String },
  linkDescription: { type: String },
  targetAudience: { type: String }
}, { _id: false });

const youtubeVariantSchema = new mongoose.Schema({
  title: { type: String, maxlength: 100 },
  description: { type: String, maxlength: 5000 },
  videoId: { type: mongoose.Schema.Types.ObjectId, ref: 'Asset' },
  thumbnailId: { type: mongoose.Schema.Types.ObjectId, ref: 'Asset' },
  tags: [{ type: String }],
  categoryId: { type: String },
  privacyStatus: {
    type: String,
    enum: ['public', 'private', 'unlisted'],
    default: 'public'
  },
  isShort: { type: Boolean, default: false }
}, { _id: false });

const customPlatformVariantSchema = new mongoose.Schema({
  platformName: { type: String, required: true },
  content: { type: mongoose.Schema.Types.Mixed },
  mediaIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Asset' }]
}, { _id: false });

// Comment schema for review process
const commentSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  text: {
    type: String,
    required: true,
    maxlength: 2000
  },
  type: {
    type: String,
    enum: ['comment', 'approval', 'rejection', 'revision_request'],
    default: 'comment'
  },
  resolved: {
    type: Boolean,
    default: false
  }
}, { timestamps: true });

// Version history schema
const versionSchema = new mongoose.Schema({
  content: { type: mongoose.Schema.Types.Mixed },
  variants: { type: mongoose.Schema.Types.Mixed },
  editedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  note: { type: String, default: '' }
}, { timestamps: true });

// Main Content schema
const contentSchema = new mongoose.Schema({
  // Core identification
  title: {
    type: String,
    required: true,
    trim: true,
    maxlength: 200
  },
  type: {
    type: String,
    enum: ['post', 'story', 'reel', 'thread', 'article', 'video', 'ad', 'campaign_post'],
    default: 'post',
    index: true
  },

  // Universal content body
  body: {
    type: String,
    default: '',
    maxlength: 10000
  },

  // Platform-specific variants
  variants: {
    twitter: twitterVariantSchema,
    instagram: instagramVariantSchema,
    whatsapp: whatsappVariantSchema,
    tiktok: tiktokVariantSchema,
    linkedin: linkedinVariantSchema,
    facebook: facebookVariantSchema,
    youtube: youtubeVariantSchema,
    custom: [customPlatformVariantSchema]
  },

  // Target platforms (which platforms this will be published to)
  platforms: [{
    type: String,
    enum: ['twitter', 'instagram', 'facebook', 'linkedin', 'tiktok', 'whatsapp', 'youtube', 'pinterest', 'threads', 'custom'],
    index: true
  }],

  // Workflow stage (the core pipeline)
  stage: {
    type: String,
    enum: ['idea', 'draft', 'review', 'revision', 'approved', 'scheduled', 'publishing', 'published', 'failed', 'archived'],
    default: 'idea',
    index: true
  },

  // Associated assets
  assets: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Asset'
  }],
  primaryAsset: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Asset'
  },

  // Campaign association
  campaign: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Campaign',
    index: true
  },

  // Organization - Gmail-style labels
  labels: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Label'
  }],
  tags: [{
    type: String,
    trim: true,
    lowercase: true
  }],

  // Hashtags (extracted and managed)
  hashtags: [{
    type: String,
    trim: true
  }],

  // Links
  links: [{
    url: { type: String, required: true },
    title: { type: String },
    shortUrl: { type: String },
    trackingParams: { type: mongoose.Schema.Types.Mixed }
  }],

  // Team assignments
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  assignedTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    index: true
  },
  reviewers: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  approvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  approvedAt: {
    type: Date
  },

  // Scheduling
  scheduledFor: {
    type: Date,
    index: true
  },
  publishedAt: {
    type: Date
  },
  timezone: {
    type: String,
    default: 'UTC'
  },

  // Recurring content
  isRecurring: {
    type: Boolean,
    default: false,
    index: true
  },
  recurrence: {
    rule: {
      type: String, // RRULE format or simple: 'daily', 'weekly', 'monthly'
      enum: ['daily', 'weekly', 'biweekly', 'monthly', 'custom']
    },
    customRule: { type: String }, // For complex RRULE patterns
    interval: { type: Number, default: 1 }, // Every X days/weeks/months
    daysOfWeek: [{ type: Number }], // 0-6 for weekly
    dayOfMonth: { type: Number }, // 1-31 for monthly
    endDate: { type: Date },
    maxOccurrences: { type: Number },
    occurrenceCount: { type: Number, default: 0 }
  },
  // Parent content for recurring instances
  parentContent: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Content'
  },
  // Instances created from this recurring content
  recurringInstances: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Content'
  }],

  // Review and collaboration
  comments: [commentSchema],
  pendingApprovals: [{
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    requestedAt: { type: Date, default: Date.now }
  }],

  // Version history
  versions: [versionSchema],
  currentVersion: {
    type: Number,
    default: 1
  },

  // Publishing results
  publishingResults: [{
    platform: { type: String },
    success: { type: Boolean },
    postId: { type: String }, // Platform-specific post ID
    postUrl: { type: String },
    error: { type: String },
    publishedAt: { type: Date }
  }],

  // Analytics (populated after publishing)
  analytics: {
    impressions: { type: Number, default: 0 },
    reach: { type: Number, default: 0 },
    engagement: { type: Number, default: 0 },
    clicks: { type: Number, default: 0 },
    shares: { type: Number, default: 0 },
    saves: { type: Number, default: 0 },
    lastUpdated: { type: Date }
  },

  // Priority and flags
  priority: {
    type: String,
    enum: ['low', 'normal', 'high', 'urgent'],
    default: 'normal'
  },
  isFeatured: {
    type: Boolean,
    default: false
  },

  // Notes (internal, not published)
  internalNotes: {
    type: String,
    maxlength: 5000
  },

  // AI-generated content tracking
  aiGenerated: {
    isAiGenerated: { type: Boolean, default: false },
    prompt: { type: String },
    model: { type: String },
    generatedAt: { type: Date }
  },

  // Soft delete
  deletedAt: {
    type: Date,
    default: null
  },
  deletedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true
});

// Indexes for common queries
contentSchema.index({ campaign: 1, stage: 1 });
contentSchema.index({ createdBy: 1, stage: 1 });
contentSchema.index({ assignedTo: 1, stage: 1 });
contentSchema.index({ scheduledFor: 1, stage: 1 });
contentSchema.index({ isRecurring: 1, 'recurrence.rule': 1 });
contentSchema.index({ platforms: 1, stage: 1 });
contentSchema.index({ title: 'text', body: 'text', tags: 'text', hashtags: 'text' });

// Pre-save: Extract hashtags from body
contentSchema.pre('save', function(next) {
  if (this.isModified('body')) {
    const hashtagRegex = /#[\w\u0590-\u05ff]+/g;
    const matches = this.body.match(hashtagRegex);
    if (matches) {
      this.hashtags = [...new Set(matches.map(h => h.toLowerCase()))];
    }
  }
  next();
});

// Virtual for all assigned users
contentSchema.virtual('allAssignees').get(function() {
  const assignees = [];
  if (this.assignedTo) assignees.push(this.assignedTo);
  if (this.reviewers) assignees.push(...this.reviewers);
  return assignees;
});

// Check if content is ready to publish
contentSchema.virtual('isReadyToPublish').get(function() {
  return this.stage === 'approved' && this.scheduledFor;
});

// Get next scheduled date for recurring content
contentSchema.methods.getNextOccurrence = function() {
  if (!this.isRecurring || !this.recurrence.rule) return null;

  const lastDate = this.scheduledFor || new Date();
  const interval = this.recurrence.interval || 1;

  switch (this.recurrence.rule) {
    case 'daily':
      return new Date(lastDate.getTime() + interval * 24 * 60 * 60 * 1000);
    case 'weekly':
      return new Date(lastDate.getTime() + interval * 7 * 24 * 60 * 60 * 1000);
    case 'biweekly':
      return new Date(lastDate.getTime() + 14 * 24 * 60 * 60 * 1000);
    case 'monthly':
      const next = new Date(lastDate);
      next.setMonth(next.getMonth() + interval);
      return next;
    default:
      return null;
  }
};

// Create a recurring instance
contentSchema.methods.createRecurringInstance = async function(scheduledDate) {
  const instance = new this.constructor({
    ...this.toObject(),
    _id: undefined,
    parentContent: this._id,
    isRecurring: false,
    recurrence: undefined,
    recurringInstances: undefined,
    scheduledFor: scheduledDate,
    stage: 'scheduled',
    publishedAt: null,
    publishingResults: [],
    comments: [],
    versions: [],
    currentVersion: 1,
    createdAt: undefined,
    updatedAt: undefined
  });

  await instance.save();

  // Add to parent's instances list
  this.recurringInstances.push(instance._id);
  this.recurrence.occurrenceCount += 1;
  await this.save();

  return instance;
};

// Save a new version
contentSchema.methods.saveVersion = async function(userId, note = '') {
  this.versions.push({
    content: {
      title: this.title,
      body: this.body,
      type: this.type
    },
    variants: this.variants,
    editedBy: userId,
    note
  });
  this.currentVersion += 1;

  // Keep only last 20 versions
  if (this.versions.length > 20) {
    this.versions = this.versions.slice(-20);
  }

  return this.save();
};

// Move to next stage
contentSchema.methods.moveToStage = async function(newStage, userId) {
  const validTransitions = {
    'idea': ['draft', 'archived'],
    'draft': ['review', 'archived'],
    'review': ['revision', 'approved', 'archived'],
    'revision': ['review', 'archived'],
    'approved': ['scheduled', 'review', 'archived'],
    'scheduled': ['publishing', 'approved', 'archived'],
    'publishing': ['published', 'failed'],
    'published': ['archived'],
    'failed': ['draft', 'archived'],
    'archived': ['draft', 'idea']
  };

  const allowed = validTransitions[this.stage];
  if (!allowed || !allowed.includes(newStage)) {
    throw new Error(`Cannot transition from ${this.stage} to ${newStage}`);
  }

  const oldStage = this.stage;
  this.stage = newStage;

  // Add system comment for stage change
  this.comments.push({
    user: userId,
    text: `Status changed from ${oldStage} to ${newStage}`,
    type: 'comment'
  });

  if (newStage === 'approved') {
    this.approvedBy = userId;
    this.approvedAt = new Date();
  }

  return this.save();
};

// Request approval
contentSchema.methods.requestApproval = async function(approverIds, requesterId) {
  this.pendingApprovals = approverIds.map(id => ({
    user: id,
    requestedAt: new Date()
  }));
  this.stage = 'review';

  this.comments.push({
    user: requesterId,
    text: 'Approval requested',
    type: 'comment'
  });

  return this.save();
};

// Add approval
contentSchema.methods.addApproval = async function(userId, approved, note = '') {
  // Remove from pending
  this.pendingApprovals = this.pendingApprovals.filter(
    p => p.user.toString() !== userId.toString()
  );

  this.comments.push({
    user: userId,
    text: note || (approved ? 'Approved' : 'Rejected'),
    type: approved ? 'approval' : 'rejection'
  });

  // If all approvals received and all approved
  if (this.pendingApprovals.length === 0 && approved) {
    this.stage = 'approved';
    this.approvedBy = userId;
    this.approvedAt = new Date();
  } else if (!approved) {
    this.stage = 'revision';
  }

  return this.save();
};

// Static: Get content by stage for Kanban board
contentSchema.statics.getByStage = async function(userId, options = {}) {
  const { campaignId, stages, page = 1, limit = 50 } = options;

  const query = {
    deletedAt: null,
    $or: [
      { createdBy: userId },
      { assignedTo: userId },
      { reviewers: userId }
    ]
  };

  if (campaignId) query.campaign = campaignId;
  if (stages && stages.length) query.stage = { $in: stages };

  const content = await this.find(query)
    .populate('createdBy', 'firstName lastName email')
    .populate('assignedTo', 'firstName lastName email')
    .populate('primaryAsset', 'thumbnailUrl s3Url type')
    .populate('labels', 'name color')
    .populate('campaign', 'name color')
    .sort({ updatedAt: -1 })
    .skip((page - 1) * limit)
    .limit(limit);

  // Group by stage
  const grouped = {};
  const stageOrder = ['idea', 'draft', 'review', 'revision', 'approved', 'scheduled', 'published', 'archived'];
  stageOrder.forEach(stage => { grouped[stage] = []; });

  content.forEach(item => {
    if (grouped[item.stage]) {
      grouped[item.stage].push(item);
    }
  });

  return grouped;
};

// Static: Get calendar content
contentSchema.statics.getForCalendar = async function(userId, startDate, endDate, options = {}) {
  const { campaignId, platforms } = options;

  const query = {
    deletedAt: null,
    scheduledFor: { $gte: startDate, $lte: endDate },
    stage: { $in: ['scheduled', 'published'] },
    $or: [
      { createdBy: userId },
      { assignedTo: userId }
    ]
  };

  if (campaignId) query.campaign = campaignId;
  if (platforms && platforms.length) query.platforms = { $in: platforms };

  return this.find(query)
    .populate('primaryAsset', 'thumbnailUrl s3Url')
    .populate('campaign', 'name color')
    .sort({ scheduledFor: 1 });
};

// Soft delete
contentSchema.methods.softDelete = async function(userId) {
  this.deletedAt = new Date();
  this.deletedBy = userId;
  this.stage = 'archived';
  return this.save();
};

contentSchema.set('toJSON', { virtuals: true });

module.exports = mongoose.model('Content', contentSchema);
