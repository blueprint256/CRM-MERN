const mongoose = require('mongoose');
const {
  TASK_TYPES,
  TASK_STATUSES,
  TASK_PRIORITIES,
  ROLES
} = require('../config/constants');

/**
 * Task Model
 *
 * Explicit work item for tracking all workflow tasks.
 * Tasks are first-class entities that can be associated with content, campaigns, or stand alone.
 *
 * This provides:
 * - Clear visibility into who needs to do what
 * - Explicit due dates and dependencies
 * - Gantt chart data source
 * - Action items for the Inbox hub
 */
const taskSchema = new mongoose.Schema({
  // === WORKSPACE REFERENCE ===
  workspace: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Workspace',
    required: true,
    index: true
  },

  // === TASK IDENTITY ===
  title: {
    type: String,
    required: [true, 'Task title is required'],
    trim: true,
    maxlength: [200, 'Title cannot exceed 200 characters']
  },
  description: {
    type: String,
    default: '',
    maxlength: [2000, 'Description cannot exceed 2000 characters']
  },

  // === TYPE & STATUS ===
  type: {
    type: String,
    enum: Object.values(TASK_TYPES),
    default: TASK_TYPES.GENERAL,
    index: true
  },
  status: {
    type: String,
    enum: Object.values(TASK_STATUSES),
    default: TASK_STATUSES.PENDING,
    index: true
  },
  priority: {
    type: String,
    enum: Object.values(TASK_PRIORITIES),
    default: TASK_PRIORITIES.NORMAL,
    index: true
  },

  // === ASSOCIATIONS ===
  // Tasks can be linked to content, campaigns, or stand alone
  content: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Content',
    default: null,
    index: true
  },
  campaign: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Campaign',
    default: null,
    index: true
  },

  // === ASSIGNMENT ===
  assignedTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    index: true
  },
  assignedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  assignedAt: {
    type: Date
  },

  // Optional: roles that can complete this task
  allowedRoles: [{
    type: String,
    enum: Object.values(ROLES)
  }],

  // === TIMING ===
  dueDate: {
    type: Date,
    index: true
  },
  startDate: {
    type: Date
  },
  completedAt: {
    type: Date
  },
  completedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },

  // Estimated and actual time (in minutes)
  estimatedTime: {
    type: Number,
    default: null
  },
  actualTime: {
    type: Number,
    default: null
  },

  // === DEPENDENCIES ===
  // Tasks that must be completed before this one can start
  dependsOn: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Task'
  }],
  // Tasks that depend on this one
  blockedBy: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Task'
  }],

  // === PROGRESS ===
  // For tasks that have sub-steps
  progress: {
    type: Number,
    min: 0,
    max: 100,
    default: 0
  },
  checklist: [{
    text: { type: String, required: true },
    completed: { type: Boolean, default: false },
    completedAt: { type: Date },
    completedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
  }],

  // === COMMENTS ===
  comments: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    text: {
      type: String,
      required: true,
      maxlength: 1000
    },
    createdAt: {
      type: Date,
      default: Date.now
    }
  }],

  // === METADATA ===
  tags: [{
    type: String,
    trim: true,
    lowercase: true
  }],
  labels: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Label'
  }],

  // For recurring tasks
  isRecurring: {
    type: Boolean,
    default: false
  },
  recurrence: {
    rule: {
      type: String,
      enum: ['daily', 'weekly', 'biweekly', 'monthly', null]
    },
    nextOccurrence: { type: Date }
  },
  parentTask: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Task'
  },

  // === AUDIT ===
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
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
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// === INDEXES ===
taskSchema.index({ workspace: 1, status: 1 });
taskSchema.index({ assignedTo: 1, status: 1 });
taskSchema.index({ dueDate: 1, status: 1 });
taskSchema.index({ content: 1 });
taskSchema.index({ campaign: 1 });
taskSchema.index({ dependsOn: 1 });
taskSchema.index({ title: 'text', description: 'text', tags: 'text' });

// === VIRTUALS ===

taskSchema.virtual('isOverdue').get(function() {
  if (!this.dueDate || this.status === TASK_STATUSES.COMPLETED) return false;
  return new Date() > this.dueDate;
});

taskSchema.virtual('isDueSoon').get(function() {
  if (!this.dueDate || this.status === TASK_STATUSES.COMPLETED) return false;
  const now = new Date();
  const soon = new Date(now.getTime() + 24 * 60 * 60 * 1000); // 24 hours
  return this.dueDate <= soon && this.dueDate > now;
});

taskSchema.virtual('checklistProgress').get(function() {
  if (!this.checklist || this.checklist.length === 0) return null;
  const completed = this.checklist.filter(item => item.completed).length;
  return Math.round((completed / this.checklist.length) * 100);
});

taskSchema.virtual('canStart').get(function() {
  // Task can start if all dependencies are completed
  // This is a simple check - for populated dependencies, use method
  return this.status === TASK_STATUSES.PENDING && this.dependsOn.length === 0;
});

// === INSTANCE METHODS ===

/**
 * Check if all dependencies are completed
 */
taskSchema.methods.areDependenciesComplete = async function() {
  if (this.dependsOn.length === 0) return true;

  const Task = mongoose.model('Task');
  const dependencies = await Task.find({
    _id: { $in: this.dependsOn },
    status: { $ne: TASK_STATUSES.COMPLETED }
  });

  return dependencies.length === 0;
};

/**
 * Start the task
 */
taskSchema.methods.start = async function(userId) {
  const canStart = await this.areDependenciesComplete();
  if (!canStart) {
    throw new Error('Cannot start task: dependencies not completed');
  }

  this.status = TASK_STATUSES.IN_PROGRESS;
  if (!this.startDate) {
    this.startDate = new Date();
  }
  if (!this.assignedTo) {
    this.assignedTo = userId;
    this.assignedAt = new Date();
  }

  return this.save();
};

/**
 * Complete the task
 */
taskSchema.methods.complete = async function(userId, actualTime = null) {
  this.status = TASK_STATUSES.COMPLETED;
  this.completedAt = new Date();
  this.completedBy = userId;
  this.progress = 100;

  if (actualTime) {
    this.actualTime = actualTime;
  }

  // Mark all checklist items as complete
  this.checklist.forEach(item => {
    if (!item.completed) {
      item.completed = true;
      item.completedAt = new Date();
      item.completedBy = userId;
    }
  });

  await this.save();

  // Unblock dependent tasks
  const Task = mongoose.model('Task');
  await Task.updateMany(
    { blockedBy: this._id },
    { $pull: { blockedBy: this._id } }
  );

  return this;
};

/**
 * Block the task
 */
taskSchema.methods.block = async function(reason = '') {
  this.status = TASK_STATUSES.BLOCKED;
  if (reason) {
    this.comments.push({
      user: null, // System comment
      text: `Task blocked: ${reason}`,
      createdAt: new Date()
    });
  }
  return this.save();
};

/**
 * Assign to user
 */
taskSchema.methods.assign = async function(userId, assignedBy) {
  this.assignedTo = userId;
  this.assignedBy = assignedBy;
  this.assignedAt = new Date();
  return this.save();
};

/**
 * Update checklist item
 */
taskSchema.methods.updateChecklistItem = async function(index, completed, userId) {
  if (index < 0 || index >= this.checklist.length) {
    throw new Error('Invalid checklist index');
  }

  this.checklist[index].completed = completed;
  if (completed) {
    this.checklist[index].completedAt = new Date();
    this.checklist[index].completedBy = userId;
  } else {
    this.checklist[index].completedAt = null;
    this.checklist[index].completedBy = null;
  }

  // Update overall progress
  const completedCount = this.checklist.filter(item => item.completed).length;
  this.progress = Math.round((completedCount / this.checklist.length) * 100);

  return this.save();
};

/**
 * Add comment
 */
taskSchema.methods.addComment = async function(userId, text) {
  this.comments.push({
    user: userId,
    text,
    createdAt: new Date()
  });
  return this.save();
};

/**
 * Soft delete
 */
taskSchema.methods.softDelete = async function(userId) {
  this.deletedAt = new Date();
  this.deletedBy = userId;
  return this.save();
};

// === STATIC METHODS ===

/**
 * Get tasks for user's inbox (assigned or created)
 */
taskSchema.statics.getForInbox = async function(userId, workspaceId, options = {}) {
  const { status, priority, limit = 50, page = 1 } = options;

  const query = {
    workspace: workspaceId,
    deletedAt: null,
    $or: [
      { assignedTo: userId },
      { createdBy: userId }
    ]
  };

  if (status) query.status = status;
  if (priority) query.priority = priority;

  const [tasks, total] = await Promise.all([
    this.find(query)
      .populate('assignedTo', 'firstName lastName email profilePicture')
      .populate('content', 'title stage')
      .populate('campaign', 'name color')
      .sort({ priority: -1, dueDate: 1, createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit),
    this.countDocuments(query)
  ]);

  return { tasks, total, page, totalPages: Math.ceil(total / limit) };
};

/**
 * Get overdue tasks
 */
taskSchema.statics.getOverdue = async function(workspaceId) {
  return this.find({
    workspace: workspaceId,
    deletedAt: null,
    status: { $nin: [TASK_STATUSES.COMPLETED, TASK_STATUSES.CANCELLED] },
    dueDate: { $lt: new Date() }
  })
    .populate('assignedTo', 'firstName lastName email')
    .sort({ dueDate: 1 });
};

/**
 * Get tasks for Gantt chart
 */
taskSchema.statics.getForGantt = async function(campaignId) {
  return this.find({
    campaign: campaignId,
    deletedAt: null
  })
    .populate('assignedTo', 'firstName lastName')
    .populate('dependsOn', 'title startDate dueDate status')
    .sort({ startDate: 1, dueDate: 1 });
};

/**
 * Create task from content stage change
 */
taskSchema.statics.createForContentStage = async function(content, stage, assigneeId, createdBy) {
  const typeMap = {
    'draft': TASK_TYPES.CONTENT_CREATION,
    'design': TASK_TYPES.DESIGN,
    'review': TASK_TYPES.REVIEW,
    'approval': TASK_TYPES.APPROVAL,
    'scheduled': TASK_TYPES.PUBLISHING,
    'revision': TASK_TYPES.REVISION
  };

  const task = new this({
    workspace: content.workspace,
    title: `${stage.charAt(0).toUpperCase() + stage.slice(1)}: ${content.title}`,
    type: typeMap[stage] || TASK_TYPES.GENERAL,
    status: TASK_STATUSES.PENDING,
    content: content._id,
    campaign: content.campaign,
    assignedTo: assigneeId,
    assignedBy: createdBy,
    assignedAt: new Date(),
    createdBy
  });

  return task.save();
};

/**
 * Get task statistics for workspace
 */
taskSchema.statics.getStats = async function(workspaceId) {
  const stats = await this.aggregate([
    { $match: { workspace: mongoose.Types.ObjectId(workspaceId), deletedAt: null } },
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 }
      }
    }
  ]);

  const overdue = await this.countDocuments({
    workspace: workspaceId,
    deletedAt: null,
    status: { $nin: [TASK_STATUSES.COMPLETED, TASK_STATUSES.CANCELLED] },
    dueDate: { $lt: new Date() }
  });

  return {
    byStatus: stats.reduce((acc, s) => {
      acc[s._id] = s.count;
      return acc;
    }, {}),
    overdue
  };
};

module.exports = mongoose.model('Task', taskSchema);
