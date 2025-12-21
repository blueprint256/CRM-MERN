const mongoose = require('mongoose');

/**
 * WorkflowDefinition Model
 *
 * Configurable content workflow pipeline that adapts to user type.
 * Solo users get a streamlined flow; teams get full approval gates.
 *
 * Inspired by: Frappe CRM's workflow builder and Buffer's content approval system
 */
const workflowDefinitionSchema = new mongoose.Schema({
  // === IDENTITY ===
  name: {
    type: String,
    required: [true, 'Workflow name is required'],
    trim: true,
    maxlength: [100, 'Name cannot exceed 100 characters']
  },
  description: {
    type: String,
    maxlength: [500, 'Description cannot exceed 500 characters']
  },

  // === WORKSPACE REFERENCE ===
  workspace: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Workspace'
  },

  // === PRESET TYPE ===
  preset: {
    type: String,
    enum: ['solo', 'team', 'agency', 'custom'],
    default: 'custom'
  },

  isDefault: {
    type: Boolean,
    default: false
  },

  isSystem: {
    type: Boolean,
    default: false
  },

  // === STAGES ===
  stages: [{
    id: {
      type: String,
      required: true
    },
    name: {
      type: String,
      required: true,
      trim: true
    },
    description: String,
    color: {
      type: String,
      default: '#6c757d'
    },
    icon: {
      type: String,
      default: 'bi-circle'
    },
    order: {
      type: Number,
      required: true
    },
    // Stage type for special handling
    type: {
      type: String,
      enum: ['initial', 'working', 'review', 'approved', 'scheduled', 'publishing', 'terminal', 'error'],
      default: 'working'
    },
    // Can content be edited in this stage?
    allowEditing: {
      type: Boolean,
      default: true
    },
    // Auto-advance rules
    autoAdvance: {
      enabled: { type: Boolean, default: false },
      condition: {
        type: String,
        enum: [
          'all_approvers_approved',
          'any_approver_approved',
          'scheduled_time_reached',
          'publishing_complete',
          'has_media',
          'word_count_met',
          'manual'
        ]
      },
      targetStage: String
    },
    // Time limits
    sla: {
      enabled: { type: Boolean, default: false },
      maxHours: Number,
      escalateToRole: String,
      notifyBefore: Number // hours before deadline
    }
  }],

  // === TRANSITIONS ===
  transitions: [{
    id: {
      type: String,
      required: true
    },
    name: String,
    from: {
      type: String,
      required: true
    },
    to: {
      type: String,
      required: true
    },
    // Who can trigger this transition
    allowedRoles: [{
      type: String,
      enum: ['owner', 'manager', 'marketeer', 'designer', 'client', 'contributor', 'viewer', 'system']
    }],
    // Gate requirements
    requiresApproval: {
      type: Boolean,
      default: false
    },
    approverRoles: [{
      type: String,
      enum: ['owner', 'manager', 'marketeer', 'designer', 'client']
    }],
    minimumApprovers: {
      type: Number,
      default: 1
    },
    // Conditions
    conditions: [{
      field: String,
      operator: {
        type: String,
        enum: ['equals', 'not_equals', 'contains', 'not_empty', 'greater_than', 'less_than']
      },
      value: mongoose.Schema.Types.Mixed
    }],
    // Actions on transition
    actions: [{
      type: {
        type: String,
        enum: ['notify', 'assign', 'set_field', 'send_webhook', 'create_task']
      },
      config: mongoose.Schema.Types.Mixed
    }],
    // UI configuration
    buttonLabel: String,
    buttonColor: {
      type: String,
      default: 'primary'
    },
    confirmRequired: {
      type: Boolean,
      default: false
    },
    confirmMessage: String
  }],

  // === GLOBAL SETTINGS ===
  settings: {
    // Allow skipping stages (for power users)
    allowSkipStages: {
      type: Boolean,
      default: false
    },
    skipAllowedRoles: [{
      type: String,
      enum: ['owner', 'manager']
    }],
    // Parallel approvals
    parallelApproval: {
      type: Boolean,
      default: true
    },
    // Auto-archive settings
    autoArchive: {
      enabled: { type: Boolean, default: false },
      afterDays: { type: Number, default: 30 },
      fromStage: { type: String, default: 'published' }
    },
    // Failed content handling
    failedContentBehavior: {
      type: String,
      enum: ['keep_in_failed', 'move_to_draft', 'notify_and_wait'],
      default: 'notify_and_wait'
    }
  },

  // === METADATA ===
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
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
workflowDefinitionSchema.index({ workspace: 1 });
workflowDefinitionSchema.index({ preset: 1 });
workflowDefinitionSchema.index({ isDefault: 1 });

// === VIRTUALS ===
workflowDefinitionSchema.virtual('stageCount').get(function() {
  return this.stages.length;
});

workflowDefinitionSchema.virtual('transitionCount').get(function() {
  return this.transitions.length;
});

// === INSTANCE METHODS ===

/**
 * Get a stage by ID
 */
workflowDefinitionSchema.methods.getStage = function(stageId) {
  return this.stages.find(s => s.id === stageId);
};

/**
 * Get the initial stage
 */
workflowDefinitionSchema.methods.getInitialStage = function() {
  return this.stages.find(s => s.type === 'initial') || this.stages[0];
};

/**
 * Get terminal stages (published, archived)
 */
workflowDefinitionSchema.methods.getTerminalStages = function() {
  return this.stages.filter(s => s.type === 'terminal');
};

/**
 * Get valid transitions from a stage
 */
workflowDefinitionSchema.methods.getTransitionsFrom = function(stageId) {
  return this.transitions.filter(t => t.from === stageId);
};

/**
 * Get valid transitions to a stage
 */
workflowDefinitionSchema.methods.getTransitionsTo = function(stageId) {
  return this.transitions.filter(t => t.to === stageId);
};

/**
 * Check if a transition is valid
 */
workflowDefinitionSchema.methods.isValidTransition = function(fromStage, toStage) {
  return this.transitions.some(t => t.from === fromStage && t.to === toStage);
};

/**
 * Check if a user can perform a transition
 */
workflowDefinitionSchema.methods.canPerformTransition = function(fromStage, toStage, userRole) {
  const transition = this.transitions.find(t => t.from === fromStage && t.to === toStage);

  if (!transition) return { allowed: false, reason: 'Invalid transition' };

  if (transition.allowedRoles.length === 0) {
    return { allowed: true };
  }

  if (!transition.allowedRoles.includes(userRole)) {
    return {
      allowed: false,
      reason: `Role '${userRole}' is not allowed to perform this transition`
    };
  }

  return { allowed: true };
};

/**
 * Get transition requirements
 */
workflowDefinitionSchema.methods.getTransitionRequirements = function(fromStage, toStage) {
  const transition = this.transitions.find(t => t.from === fromStage && t.to === toStage);

  if (!transition) return null;

  return {
    requiresApproval: transition.requiresApproval,
    approverRoles: transition.approverRoles,
    minimumApprovers: transition.minimumApprovers,
    conditions: transition.conditions
  };
};

/**
 * Get stages in order
 */
workflowDefinitionSchema.methods.getOrderedStages = function() {
  return [...this.stages].sort((a, b) => a.order - b.order);
};

/**
 * Add a custom stage
 */
workflowDefinitionSchema.methods.addStage = async function(stageConfig) {
  const existingStage = this.stages.find(s => s.id === stageConfig.id);
  if (existingStage) {
    throw new Error(`Stage '${stageConfig.id}' already exists`);
  }

  // Set order to be after the last working stage
  if (!stageConfig.order) {
    const maxOrder = Math.max(...this.stages.map(s => s.order), 0);
    stageConfig.order = maxOrder + 1;
  }

  this.stages.push(stageConfig);
  await this.save();
  return this;
};

/**
 * Add a custom transition
 */
workflowDefinitionSchema.methods.addTransition = async function(transitionConfig) {
  // Validate stages exist
  const fromStage = this.stages.find(s => s.id === transitionConfig.from);
  const toStage = this.stages.find(s => s.id === transitionConfig.to);

  if (!fromStage) {
    throw new Error(`From stage '${transitionConfig.from}' does not exist`);
  }
  if (!toStage) {
    throw new Error(`To stage '${transitionConfig.to}' does not exist`);
  }

  // Generate ID if not provided
  if (!transitionConfig.id) {
    transitionConfig.id = `${transitionConfig.from}_to_${transitionConfig.to}`;
  }

  // Check for duplicate
  const existingTransition = this.transitions.find(t => t.id === transitionConfig.id);
  if (existingTransition) {
    throw new Error(`Transition '${transitionConfig.id}' already exists`);
  }

  this.transitions.push(transitionConfig);
  await this.save();
  return this;
};

// === STATIC METHODS ===

/**
 * Create the Solo (Hybrid User) workflow preset
 * Streamlined flow without approval gates
 */
workflowDefinitionSchema.statics.createSoloPreset = async function(workspaceId = null) {
  const workflow = new this({
    name: 'Solo Marketer Workflow',
    description: 'Streamlined workflow for solo marketers without approval gates',
    workspace: workspaceId,
    preset: 'solo',
    isDefault: true,
    stages: [
      {
        id: 'idea',
        name: 'Ideas',
        description: 'Content ideas and concepts',
        color: '#6c757d',
        icon: 'bi-lightbulb',
        order: 1,
        type: 'initial',
        allowEditing: true
      },
      {
        id: 'draft',
        name: 'Drafts',
        description: 'Work in progress content',
        color: '#0d6efd',
        icon: 'bi-pencil',
        order: 2,
        type: 'working',
        allowEditing: true
      },
      {
        id: 'ready',
        name: 'Ready',
        description: 'Content ready to schedule',
        color: '#198754',
        icon: 'bi-check-circle',
        order: 3,
        type: 'approved',
        allowEditing: true
      },
      {
        id: 'scheduled',
        name: 'Scheduled',
        description: 'Content scheduled for publishing',
        color: '#0dcaf0',
        icon: 'bi-calendar-check',
        order: 4,
        type: 'scheduled',
        allowEditing: false,
        autoAdvance: {
          enabled: true,
          condition: 'scheduled_time_reached',
          targetStage: 'publishing'
        }
      },
      {
        id: 'publishing',
        name: 'Publishing',
        description: 'Content being published to platforms',
        color: '#fd7e14',
        icon: 'bi-send',
        order: 5,
        type: 'publishing',
        allowEditing: false,
        autoAdvance: {
          enabled: true,
          condition: 'publishing_complete',
          targetStage: 'published'
        }
      },
      {
        id: 'published',
        name: 'Published',
        description: 'Successfully published content',
        color: '#20c997',
        icon: 'bi-check2-all',
        order: 6,
        type: 'terminal',
        allowEditing: false
      },
      {
        id: 'failed',
        name: 'Failed',
        description: 'Publishing failed - needs attention',
        color: '#dc3545',
        icon: 'bi-exclamation-triangle',
        order: 7,
        type: 'error',
        allowEditing: true
      },
      {
        id: 'archived',
        name: 'Archived',
        description: 'Archived content for future reuse',
        color: '#6c757d',
        icon: 'bi-archive',
        order: 8,
        type: 'terminal',
        allowEditing: false
      }
    ],
    transitions: [
      { id: 'idea_to_draft', from: 'idea', to: 'draft', allowedRoles: ['owner', 'manager', 'marketeer', 'designer'], buttonLabel: 'Start Draft' },
      { id: 'draft_to_idea', from: 'draft', to: 'idea', allowedRoles: ['owner', 'manager', 'marketeer', 'designer'], buttonLabel: 'Back to Ideas' },
      { id: 'draft_to_ready', from: 'draft', to: 'ready', allowedRoles: ['owner', 'manager', 'marketeer', 'designer'], buttonLabel: 'Mark Ready' },
      { id: 'ready_to_draft', from: 'ready', to: 'draft', allowedRoles: ['owner', 'manager', 'marketeer', 'designer'], buttonLabel: 'Back to Draft' },
      { id: 'ready_to_scheduled', from: 'ready', to: 'scheduled', allowedRoles: ['owner', 'manager', 'marketeer'], buttonLabel: 'Schedule', confirmRequired: true },
      { id: 'scheduled_to_ready', from: 'scheduled', to: 'ready', allowedRoles: ['owner', 'manager', 'marketeer'], buttonLabel: 'Unschedule' },
      { id: 'scheduled_to_publishing', from: 'scheduled', to: 'publishing', allowedRoles: ['system'], buttonLabel: 'Publish Now' },
      { id: 'publishing_to_published', from: 'publishing', to: 'published', allowedRoles: ['system'] },
      { id: 'publishing_to_failed', from: 'publishing', to: 'failed', allowedRoles: ['system'] },
      { id: 'failed_to_draft', from: 'failed', to: 'draft', allowedRoles: ['owner', 'manager', 'marketeer'], buttonLabel: 'Edit & Retry' },
      { id: 'failed_to_scheduled', from: 'failed', to: 'scheduled', allowedRoles: ['owner', 'manager', 'marketeer'], buttonLabel: 'Retry' },
      { id: 'published_to_archived', from: 'published', to: 'archived', allowedRoles: ['owner', 'manager', 'marketeer'], buttonLabel: 'Archive' },
      { id: 'archived_to_draft', from: 'archived', to: 'draft', allowedRoles: ['owner', 'manager', 'marketeer'], buttonLabel: 'Reuse' }
    ],
    settings: {
      allowSkipStages: true,
      skipAllowedRoles: ['owner'],
      parallelApproval: false,
      autoArchive: {
        enabled: true,
        afterDays: 30,
        fromStage: 'published'
      }
    }
  });

  await workflow.save();
  return workflow;
};

/**
 * Create the Team workflow preset
 * Full approval gates with client review
 */
workflowDefinitionSchema.statics.createTeamPreset = async function(workspaceId = null) {
  const workflow = new this({
    name: 'Team Workflow',
    description: 'Full workflow with approval gates for team collaboration',
    workspace: workspaceId,
    preset: 'team',
    isDefault: true,
    stages: [
      {
        id: 'idea',
        name: 'Ideas',
        description: 'Content ideas and concepts',
        color: '#6c757d',
        icon: 'bi-lightbulb',
        order: 1,
        type: 'initial',
        allowEditing: true
      },
      {
        id: 'draft',
        name: 'Drafts',
        description: 'Work in progress content',
        color: '#0d6efd',
        icon: 'bi-pencil',
        order: 2,
        type: 'working',
        allowEditing: true
      },
      {
        id: 'review',
        name: 'In Review',
        description: 'Awaiting client/manager approval',
        color: '#ffc107',
        icon: 'bi-eye',
        order: 3,
        type: 'review',
        allowEditing: false,
        sla: {
          enabled: true,
          maxHours: 48,
          escalateToRole: 'manager',
          notifyBefore: 12
        }
      },
      {
        id: 'revision',
        name: 'Revision',
        description: 'Changes requested by reviewer',
        color: '#fd7e14',
        icon: 'bi-arrow-repeat',
        order: 4,
        type: 'working',
        allowEditing: true
      },
      {
        id: 'approved',
        name: 'Approved',
        description: 'Content approved and ready',
        color: '#198754',
        icon: 'bi-check-circle',
        order: 5,
        type: 'approved',
        allowEditing: false
      },
      {
        id: 'scheduled',
        name: 'Scheduled',
        description: 'Content scheduled for publishing',
        color: '#0dcaf0',
        icon: 'bi-calendar-check',
        order: 6,
        type: 'scheduled',
        allowEditing: false,
        autoAdvance: {
          enabled: true,
          condition: 'scheduled_time_reached',
          targetStage: 'publishing'
        }
      },
      {
        id: 'publishing',
        name: 'Publishing',
        description: 'Content being published',
        color: '#fd7e14',
        icon: 'bi-send',
        order: 7,
        type: 'publishing',
        allowEditing: false
      },
      {
        id: 'published',
        name: 'Published',
        description: 'Successfully published',
        color: '#20c997',
        icon: 'bi-check2-all',
        order: 8,
        type: 'terminal',
        allowEditing: false
      },
      {
        id: 'failed',
        name: 'Failed',
        description: 'Publishing failed',
        color: '#dc3545',
        icon: 'bi-exclamation-triangle',
        order: 9,
        type: 'error',
        allowEditing: true
      },
      {
        id: 'archived',
        name: 'Archived',
        description: 'Archived content',
        color: '#6c757d',
        icon: 'bi-archive',
        order: 10,
        type: 'terminal',
        allowEditing: false
      }
    ],
    transitions: [
      { id: 'idea_to_draft', from: 'idea', to: 'draft', allowedRoles: ['owner', 'manager', 'marketeer', 'designer'], buttonLabel: 'Start Draft' },
      { id: 'draft_to_idea', from: 'draft', to: 'idea', allowedRoles: ['owner', 'manager', 'marketeer', 'designer'], buttonLabel: 'Back to Ideas' },
      {
        id: 'draft_to_review',
        from: 'draft',
        to: 'review',
        allowedRoles: ['owner', 'manager', 'marketeer', 'designer'],
        buttonLabel: 'Request Review',
        requiresApproval: true,
        approverRoles: ['client', 'manager'],
        minimumApprovers: 1,
        confirmRequired: true,
        confirmMessage: 'Submit this content for review?'
      },
      { id: 'review_to_revision', from: 'review', to: 'revision', allowedRoles: ['owner', 'manager', 'client'], buttonLabel: 'Request Changes' },
      { id: 'review_to_approved', from: 'review', to: 'approved', allowedRoles: ['owner', 'manager', 'client'], buttonLabel: 'Approve' },
      { id: 'revision_to_review', from: 'revision', to: 'review', allowedRoles: ['owner', 'manager', 'marketeer', 'designer'], buttonLabel: 'Resubmit for Review' },
      { id: 'revision_to_draft', from: 'revision', to: 'draft', allowedRoles: ['owner', 'manager', 'marketeer', 'designer'], buttonLabel: 'Back to Draft' },
      { id: 'approved_to_scheduled', from: 'approved', to: 'scheduled', allowedRoles: ['owner', 'manager', 'marketeer'], buttonLabel: 'Schedule' },
      { id: 'approved_to_draft', from: 'approved', to: 'draft', allowedRoles: ['owner', 'manager'], buttonLabel: 'Return to Draft' },
      { id: 'scheduled_to_approved', from: 'scheduled', to: 'approved', allowedRoles: ['owner', 'manager', 'marketeer'], buttonLabel: 'Unschedule' },
      { id: 'scheduled_to_publishing', from: 'scheduled', to: 'publishing', allowedRoles: ['system'] },
      { id: 'publishing_to_published', from: 'publishing', to: 'published', allowedRoles: ['system'] },
      { id: 'publishing_to_failed', from: 'publishing', to: 'failed', allowedRoles: ['system'] },
      { id: 'failed_to_draft', from: 'failed', to: 'draft', allowedRoles: ['owner', 'manager', 'marketeer'], buttonLabel: 'Edit & Retry' },
      { id: 'failed_to_scheduled', from: 'failed', to: 'scheduled', allowedRoles: ['owner', 'manager', 'marketeer'], buttonLabel: 'Retry' },
      { id: 'published_to_archived', from: 'published', to: 'archived', allowedRoles: ['owner', 'manager', 'marketeer'], buttonLabel: 'Archive' },
      { id: 'archived_to_draft', from: 'archived', to: 'draft', allowedRoles: ['owner', 'manager', 'marketeer'], buttonLabel: 'Reuse' }
    ],
    settings: {
      allowSkipStages: true,
      skipAllowedRoles: ['owner', 'manager'],
      parallelApproval: true,
      autoArchive: {
        enabled: true,
        afterDays: 30,
        fromStage: 'published'
      },
      failedContentBehavior: 'notify_and_wait'
    }
  });

  await workflow.save();
  return workflow;
};

/**
 * Create the Agency workflow preset
 * Multiple approval levels with escalation
 */
workflowDefinitionSchema.statics.createAgencyPreset = async function(workspaceId = null) {
  const workflow = new this({
    name: 'Agency Workflow',
    description: 'Multi-tier approval workflow for agency teams',
    workspace: workspaceId,
    preset: 'agency',
    isDefault: false,
    stages: [
      { id: 'idea', name: 'Ideas', color: '#6c757d', icon: 'bi-lightbulb', order: 1, type: 'initial', allowEditing: true },
      { id: 'draft', name: 'Drafts', color: '#0d6efd', icon: 'bi-pencil', order: 2, type: 'working', allowEditing: true },
      { id: 'internal_review', name: 'Internal Review', color: '#17a2b8', icon: 'bi-people', order: 3, type: 'review', allowEditing: false },
      { id: 'client_review', name: 'Client Review', color: '#ffc107', icon: 'bi-person-check', order: 4, type: 'review', allowEditing: false },
      { id: 'revision', name: 'Revision', color: '#fd7e14', icon: 'bi-arrow-repeat', order: 5, type: 'working', allowEditing: true },
      { id: 'approved', name: 'Approved', color: '#198754', icon: 'bi-check-circle', order: 6, type: 'approved', allowEditing: false },
      { id: 'scheduled', name: 'Scheduled', color: '#0dcaf0', icon: 'bi-calendar-check', order: 7, type: 'scheduled', allowEditing: false },
      { id: 'publishing', name: 'Publishing', color: '#fd7e14', icon: 'bi-send', order: 8, type: 'publishing', allowEditing: false },
      { id: 'published', name: 'Published', color: '#20c997', icon: 'bi-check2-all', order: 9, type: 'terminal', allowEditing: false },
      { id: 'failed', name: 'Failed', color: '#dc3545', icon: 'bi-exclamation-triangle', order: 10, type: 'error', allowEditing: true },
      { id: 'archived', name: 'Archived', color: '#6c757d', icon: 'bi-archive', order: 11, type: 'terminal', allowEditing: false }
    ],
    transitions: [
      { id: 'idea_to_draft', from: 'idea', to: 'draft', allowedRoles: ['owner', 'manager', 'marketeer', 'designer'] },
      { id: 'draft_to_internal', from: 'draft', to: 'internal_review', allowedRoles: ['owner', 'manager', 'marketeer', 'designer'], requiresApproval: true, approverRoles: ['manager'], minimumApprovers: 1 },
      { id: 'internal_to_client', from: 'internal_review', to: 'client_review', allowedRoles: ['owner', 'manager'], requiresApproval: true, approverRoles: ['client'], minimumApprovers: 1 },
      { id: 'internal_to_revision', from: 'internal_review', to: 'revision', allowedRoles: ['owner', 'manager'] },
      { id: 'client_to_approved', from: 'client_review', to: 'approved', allowedRoles: ['client', 'manager', 'owner'] },
      { id: 'client_to_revision', from: 'client_review', to: 'revision', allowedRoles: ['client', 'manager', 'owner'] },
      { id: 'revision_to_internal', from: 'revision', to: 'internal_review', allowedRoles: ['owner', 'manager', 'marketeer', 'designer'] },
      { id: 'approved_to_scheduled', from: 'approved', to: 'scheduled', allowedRoles: ['owner', 'manager', 'marketeer'] },
      { id: 'scheduled_to_publishing', from: 'scheduled', to: 'publishing', allowedRoles: ['system'] },
      { id: 'publishing_to_published', from: 'publishing', to: 'published', allowedRoles: ['system'] },
      { id: 'publishing_to_failed', from: 'publishing', to: 'failed', allowedRoles: ['system'] },
      { id: 'failed_to_draft', from: 'failed', to: 'draft', allowedRoles: ['owner', 'manager', 'marketeer'] },
      { id: 'published_to_archived', from: 'published', to: 'archived', allowedRoles: ['owner', 'manager', 'marketeer'] }
    ],
    settings: {
      allowSkipStages: false,
      parallelApproval: false,
      autoArchive: { enabled: true, afterDays: 60, fromStage: 'published' }
    }
  });

  await workflow.save();
  return workflow;
};

module.exports = mongoose.model('WorkflowDefinition', workflowDefinitionSchema);
