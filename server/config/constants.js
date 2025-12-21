/**
 * Centralized Constants Configuration
 *
 * Single source of truth for all enums, roles, platforms, and workflow definitions.
 * This eliminates duplication across models and ensures consistency.
 */

// =====================================================
// ROLE HIERARCHY
// =====================================================
// Clear role hierarchy from lowest to highest privilege
const ROLES = {
  VIEWER: 'viewer',
  CONTRIBUTOR: 'contributor',
  DESIGNER: 'designer',
  MARKETER: 'marketer',
  MANAGER: 'manager',
  OWNER: 'owner',
  SYSTEM_ADMIN: 'system_admin'
};

// Role hierarchy levels for comparison
const ROLE_HIERARCHY = {
  [ROLES.VIEWER]: 1,
  [ROLES.CONTRIBUTOR]: 2,
  [ROLES.DESIGNER]: 3,
  [ROLES.MARKETER]: 4,
  [ROLES.MANAGER]: 5,
  [ROLES.OWNER]: 6,
  [ROLES.SYSTEM_ADMIN]: 7
};

// Valid roles for team members (excludes system_admin)
const TEAM_ROLES = [
  ROLES.VIEWER,
  ROLES.CONTRIBUTOR,
  ROLES.DESIGNER,
  ROLES.MARKETER,
  ROLES.MANAGER,
  ROLES.OWNER
];

// =====================================================
// USER TYPES
// =====================================================
const USER_TYPES = {
  SYSTEM_ADMIN: 'system_admin',
  HYBRID: 'hybrid',        // Solo marketer
  TEAM_MEMBER: 'team_member'
};

// =====================================================
// PLATFORMS
// =====================================================
const PLATFORMS = {
  TWITTER: 'twitter',
  INSTAGRAM: 'instagram',
  FACEBOOK: 'facebook',
  LINKEDIN: 'linkedin',
  TIKTOK: 'tiktok',
  WHATSAPP: 'whatsapp',
  YOUTUBE: 'youtube',
  PINTEREST: 'pinterest',
  THREADS: 'threads',
  BLUESKY: 'bluesky',
  CUSTOM: 'custom'
};

const PLATFORM_LIST = Object.values(PLATFORMS);

// Platform configuration with display info
const PLATFORM_CONFIG = {
  [PLATFORMS.TWITTER]: {
    name: 'X (Twitter)',
    icon: 'twitter',
    color: '#1DA1F2',
    maxLength: 280,
    supportsThreads: true,
    supportsPolls: true,
    supportsImages: true,
    supportsVideos: true,
    maxImages: 4
  },
  [PLATFORMS.INSTAGRAM]: {
    name: 'Instagram',
    icon: 'instagram',
    color: '#E4405F',
    maxLength: 2200,
    supportsCarousel: true,
    supportsReels: true,
    supportsStories: true,
    supportsImages: true,
    supportsVideos: true,
    maxImages: 10
  },
  [PLATFORMS.FACEBOOK]: {
    name: 'Facebook',
    icon: 'facebook',
    color: '#1877F2',
    maxLength: 63206,
    supportsImages: true,
    supportsVideos: true,
    supportsLinks: true
  },
  [PLATFORMS.LINKEDIN]: {
    name: 'LinkedIn',
    icon: 'linkedin',
    color: '#0A66C2',
    maxLength: 3000,
    supportsImages: true,
    supportsVideos: true,
    supportsArticles: true
  },
  [PLATFORMS.TIKTOK]: {
    name: 'TikTok',
    icon: 'tiktok',
    color: '#000000',
    maxLength: 2200,
    supportsVideos: true,
    videosOnly: true
  },
  [PLATFORMS.WHATSAPP]: {
    name: 'WhatsApp',
    icon: 'whatsapp',
    color: '#25D366',
    maxLength: 4096,
    supportsImages: true,
    supportsVideos: true,
    supportsButtons: true,
    supportsLists: true
  },
  [PLATFORMS.YOUTUBE]: {
    name: 'YouTube',
    icon: 'youtube',
    color: '#FF0000',
    maxTitleLength: 100,
    maxDescriptionLength: 5000,
    supportsVideos: true,
    supportsShorts: true,
    videosOnly: true
  },
  [PLATFORMS.PINTEREST]: {
    name: 'Pinterest',
    icon: 'pinterest',
    color: '#BD081C',
    maxLength: 500,
    supportsImages: true
  },
  [PLATFORMS.THREADS]: {
    name: 'Threads',
    icon: 'threads',
    color: '#000000',
    maxLength: 500,
    supportsImages: true,
    supportsVideos: true
  },
  [PLATFORMS.BLUESKY]: {
    name: 'Bluesky',
    icon: 'cloud',
    color: '#1185FE',
    maxLength: 300,
    supportsImages: true
  }
};

// =====================================================
// CONTENT STAGES (Workflow)
// =====================================================
const CONTENT_STAGES = {
  IDEA: 'idea',
  DRAFT: 'draft',
  REVIEW: 'review',
  REVISION: 'revision',
  APPROVED: 'approved',
  SCHEDULED: 'scheduled',
  PUBLISHING: 'publishing',
  PUBLISHED: 'published',
  FAILED: 'failed',
  ARCHIVED: 'archived'
};

const CONTENT_STAGE_LIST = Object.values(CONTENT_STAGES);

// Valid stage transitions
const STAGE_TRANSITIONS = {
  [CONTENT_STAGES.IDEA]: [CONTENT_STAGES.DRAFT, CONTENT_STAGES.ARCHIVED],
  [CONTENT_STAGES.DRAFT]: [CONTENT_STAGES.REVIEW, CONTENT_STAGES.ARCHIVED],
  [CONTENT_STAGES.REVIEW]: [CONTENT_STAGES.REVISION, CONTENT_STAGES.APPROVED, CONTENT_STAGES.ARCHIVED],
  [CONTENT_STAGES.REVISION]: [CONTENT_STAGES.REVIEW, CONTENT_STAGES.ARCHIVED],
  [CONTENT_STAGES.APPROVED]: [CONTENT_STAGES.SCHEDULED, CONTENT_STAGES.REVIEW, CONTENT_STAGES.ARCHIVED],
  [CONTENT_STAGES.SCHEDULED]: [CONTENT_STAGES.PUBLISHING, CONTENT_STAGES.APPROVED, CONTENT_STAGES.ARCHIVED],
  [CONTENT_STAGES.PUBLISHING]: [CONTENT_STAGES.PUBLISHED, CONTENT_STAGES.FAILED],
  [CONTENT_STAGES.PUBLISHED]: [CONTENT_STAGES.ARCHIVED],
  [CONTENT_STAGES.FAILED]: [CONTENT_STAGES.DRAFT, CONTENT_STAGES.ARCHIVED],
  [CONTENT_STAGES.ARCHIVED]: [CONTENT_STAGES.DRAFT, CONTENT_STAGES.IDEA]
};

// Stage display configuration
const STAGE_CONFIG = {
  [CONTENT_STAGES.IDEA]: { label: 'Idea', color: '#6c757d', icon: 'lightbulb' },
  [CONTENT_STAGES.DRAFT]: { label: 'Draft', color: '#ffc107', icon: 'edit' },
  [CONTENT_STAGES.REVIEW]: { label: 'In Review', color: '#17a2b8', icon: 'eye' },
  [CONTENT_STAGES.REVISION]: { label: 'Needs Revision', color: '#fd7e14', icon: 'refresh' },
  [CONTENT_STAGES.APPROVED]: { label: 'Approved', color: '#28a745', icon: 'check-circle' },
  [CONTENT_STAGES.SCHEDULED]: { label: 'Scheduled', color: '#007bff', icon: 'clock' },
  [CONTENT_STAGES.PUBLISHING]: { label: 'Publishing...', color: '#6610f2', icon: 'upload' },
  [CONTENT_STAGES.PUBLISHED]: { label: 'Published', color: '#20c997', icon: 'globe' },
  [CONTENT_STAGES.FAILED]: { label: 'Failed', color: '#dc3545', icon: 'alert-circle' },
  [CONTENT_STAGES.ARCHIVED]: { label: 'Archived', color: '#343a40', icon: 'archive' }
};

// =====================================================
// CAMPAIGN STATUSES
// =====================================================
const CAMPAIGN_STATUSES = {
  DRAFT: 'draft',
  PLANNING: 'planning',
  ACTIVE: 'active',
  PAUSED: 'paused',
  COMPLETED: 'completed',
  ARCHIVED: 'archived'
};

const CAMPAIGN_STATUS_LIST = Object.values(CAMPAIGN_STATUSES);

// =====================================================
// TASK TYPES & STATUSES
// =====================================================
const TASK_TYPES = {
  CONTENT_CREATION: 'content_creation',
  DESIGN: 'design',
  REVIEW: 'review',
  APPROVAL: 'approval',
  PUBLISHING: 'publishing',
  REVISION: 'revision',
  GENERAL: 'general'
};

const TASK_STATUSES = {
  PENDING: 'pending',
  IN_PROGRESS: 'in_progress',
  BLOCKED: 'blocked',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled'
};

const TASK_PRIORITIES = {
  LOW: 'low',
  NORMAL: 'normal',
  HIGH: 'high',
  URGENT: 'urgent'
};

// =====================================================
// PERMISSIONS
// =====================================================
const PERMISSIONS = {
  // Content permissions
  CREATE_CONTENT: 'create_content',
  EDIT_CONTENT: 'edit_content',
  DELETE_CONTENT: 'delete_content',
  PUBLISH_CONTENT: 'publish_content',
  APPROVE_CONTENT: 'approve_content',
  SCHEDULE_CONTENT: 'schedule_content',

  // Asset permissions
  UPLOAD_ASSETS: 'upload_assets',
  EDIT_ASSETS: 'edit_assets',
  DELETE_ASSETS: 'delete_assets',

  // Campaign permissions
  CREATE_CAMPAIGN: 'create_campaign',
  EDIT_CAMPAIGN: 'edit_campaign',
  DELETE_CAMPAIGN: 'delete_campaign',

  // Team permissions
  INVITE_MEMBERS: 'invite_members',
  REMOVE_MEMBERS: 'remove_members',
  CHANGE_ROLES: 'change_roles',

  // Admin permissions
  EDIT_SETTINGS: 'edit_settings',
  MANAGE_INTEGRATIONS: 'manage_integrations',
  VIEW_ANALYTICS: 'view_analytics'
};

// Default permissions by role
const DEFAULT_PERMISSIONS_BY_ROLE = {
  [ROLES.VIEWER]: {
    [PERMISSIONS.VIEW_ANALYTICS]: true
  },
  [ROLES.CONTRIBUTOR]: {
    [PERMISSIONS.CREATE_CONTENT]: true,
    [PERMISSIONS.EDIT_CONTENT]: true,
    [PERMISSIONS.UPLOAD_ASSETS]: true,
    [PERMISSIONS.VIEW_ANALYTICS]: true
  },
  [ROLES.DESIGNER]: {
    [PERMISSIONS.CREATE_CONTENT]: true,
    [PERMISSIONS.EDIT_CONTENT]: true,
    [PERMISSIONS.UPLOAD_ASSETS]: true,
    [PERMISSIONS.EDIT_ASSETS]: true,
    [PERMISSIONS.DELETE_ASSETS]: true,
    [PERMISSIONS.EDIT_CAMPAIGN]: true,
    [PERMISSIONS.VIEW_ANALYTICS]: true
  },
  [ROLES.MARKETER]: {
    [PERMISSIONS.CREATE_CONTENT]: true,
    [PERMISSIONS.EDIT_CONTENT]: true,
    [PERMISSIONS.DELETE_CONTENT]: true,
    [PERMISSIONS.PUBLISH_CONTENT]: true,
    [PERMISSIONS.SCHEDULE_CONTENT]: true,
    [PERMISSIONS.UPLOAD_ASSETS]: true,
    [PERMISSIONS.EDIT_ASSETS]: true,
    [PERMISSIONS.DELETE_ASSETS]: true,
    [PERMISSIONS.CREATE_CAMPAIGN]: true,
    [PERMISSIONS.EDIT_CAMPAIGN]: true,
    [PERMISSIONS.INVITE_MEMBERS]: true,
    [PERMISSIONS.VIEW_ANALYTICS]: true
  },
  [ROLES.MANAGER]: {
    [PERMISSIONS.CREATE_CONTENT]: true,
    [PERMISSIONS.EDIT_CONTENT]: true,
    [PERMISSIONS.DELETE_CONTENT]: true,
    [PERMISSIONS.PUBLISH_CONTENT]: true,
    [PERMISSIONS.APPROVE_CONTENT]: true,
    [PERMISSIONS.SCHEDULE_CONTENT]: true,
    [PERMISSIONS.UPLOAD_ASSETS]: true,
    [PERMISSIONS.EDIT_ASSETS]: true,
    [PERMISSIONS.DELETE_ASSETS]: true,
    [PERMISSIONS.CREATE_CAMPAIGN]: true,
    [PERMISSIONS.EDIT_CAMPAIGN]: true,
    [PERMISSIONS.DELETE_CAMPAIGN]: true,
    [PERMISSIONS.INVITE_MEMBERS]: true,
    [PERMISSIONS.REMOVE_MEMBERS]: true,
    [PERMISSIONS.CHANGE_ROLES]: true,
    [PERMISSIONS.EDIT_SETTINGS]: true,
    [PERMISSIONS.MANAGE_INTEGRATIONS]: true,
    [PERMISSIONS.VIEW_ANALYTICS]: true
  },
  [ROLES.OWNER]: 'all', // Special marker for full permissions
  [ROLES.SYSTEM_ADMIN]: 'all'
};

// =====================================================
// WORKFLOW PRESETS
// =====================================================
const WORKFLOW_PRESETS = {
  SOLO: {
    name: 'Solo Marketer',
    description: 'Streamlined workflow for individual marketers - no approvals required',
    stages: [
      { name: CONTENT_STAGES.IDEA, autoAdvance: false },
      { name: CONTENT_STAGES.DRAFT, autoAdvance: false },
      { name: CONTENT_STAGES.APPROVED, autoAdvance: true }, // Auto-approve for solo
      { name: CONTENT_STAGES.SCHEDULED, autoAdvance: false },
      { name: CONTENT_STAGES.PUBLISHED, autoAdvance: false }
    ],
    requiresApproval: false
  },
  TEAM: {
    name: 'Team Collaboration',
    description: 'Full workflow with review and approval stages',
    stages: [
      { name: CONTENT_STAGES.IDEA, autoAdvance: false },
      { name: CONTENT_STAGES.DRAFT, autoAdvance: false },
      { name: CONTENT_STAGES.REVIEW, autoAdvance: false, approverRoles: [ROLES.MANAGER, ROLES.OWNER] },
      { name: CONTENT_STAGES.REVISION, autoAdvance: false },
      { name: CONTENT_STAGES.APPROVED, autoAdvance: false },
      { name: CONTENT_STAGES.SCHEDULED, autoAdvance: false },
      { name: CONTENT_STAGES.PUBLISHED, autoAdvance: false }
    ],
    requiresApproval: true
  },
  AGENCY: {
    name: 'Agency Workflow',
    description: 'Multi-stage approval with client review',
    stages: [
      { name: CONTENT_STAGES.IDEA, autoAdvance: false },
      { name: CONTENT_STAGES.DRAFT, autoAdvance: false },
      { name: CONTENT_STAGES.REVIEW, autoAdvance: false, approverRoles: [ROLES.MANAGER] }, // Internal review
      { name: CONTENT_STAGES.REVISION, autoAdvance: false },
      { name: CONTENT_STAGES.APPROVED, autoAdvance: false, approverRoles: [ROLES.VIEWER] }, // Client approval
      { name: CONTENT_STAGES.SCHEDULED, autoAdvance: false },
      { name: CONTENT_STAGES.PUBLISHED, autoAdvance: false }
    ],
    requiresApproval: true,
    requiresClientApproval: true
  }
};

// =====================================================
// ASSET TYPES
// =====================================================
const ASSET_TYPES = {
  IMAGE: 'image',
  VIDEO: 'video',
  DOCUMENT: 'document',
  AUDIO: 'audio',
  OTHER: 'other'
};

const ASSET_SOURCES = {
  UPLOAD: 'upload',
  CANVA: 'canva',
  IMPORT: 'import',
  AI_GENERATED: 'ai_generated',
  EXTERNAL: 'external'
};

// =====================================================
// NOTIFICATION TYPES
// =====================================================
const NOTIFICATION_TYPES = {
  CONTENT_ASSIGNED: 'content_assigned',
  CONTENT_APPROVED: 'content_approved',
  CONTENT_REJECTED: 'content_rejected',
  CONTENT_PUBLISHED: 'content_published',
  CONTENT_FAILED: 'content_failed',
  APPROVAL_REQUESTED: 'approval_requested',
  COMMENT_ADDED: 'comment_added',
  MENTIONED: 'mentioned',
  TASK_ASSIGNED: 'task_assigned',
  TASK_DUE_SOON: 'task_due_soon',
  TEAM_INVITATION: 'team_invitation',
  CAMPAIGN_UPDATED: 'campaign_updated'
};

// =====================================================
// ACTIVITY TYPES (for audit log)
// =====================================================
const ACTIVITY_TYPES = {
  // Content
  CONTENT_CREATED: 'content_created',
  CONTENT_UPDATED: 'content_updated',
  CONTENT_DELETED: 'content_deleted',
  CONTENT_STAGE_CHANGED: 'content_stage_changed',
  CONTENT_APPROVED: 'content_approved',
  CONTENT_REJECTED: 'content_rejected',
  CONTENT_SCHEDULED: 'content_scheduled',
  CONTENT_PUBLISHED: 'content_published',
  CONTENT_FAILED: 'content_failed',

  // Campaign
  CAMPAIGN_CREATED: 'campaign_created',
  CAMPAIGN_UPDATED: 'campaign_updated',
  CAMPAIGN_DELETED: 'campaign_deleted',
  CAMPAIGN_STATUS_CHANGED: 'campaign_status_changed',

  // Asset
  ASSET_UPLOADED: 'asset_uploaded',
  ASSET_UPDATED: 'asset_updated',
  ASSET_DELETED: 'asset_deleted',

  // Team
  MEMBER_INVITED: 'member_invited',
  MEMBER_JOINED: 'member_joined',
  MEMBER_REMOVED: 'member_removed',
  MEMBER_ROLE_CHANGED: 'member_role_changed',

  // User
  USER_LOGGED_IN: 'user_logged_in',
  USER_SETTINGS_UPDATED: 'user_settings_updated',

  // Task
  TASK_CREATED: 'task_created',
  TASK_UPDATED: 'task_updated',
  TASK_COMPLETED: 'task_completed',
  TASK_ASSIGNED: 'task_assigned'
};

// =====================================================
// HELPER FUNCTIONS
// =====================================================

/**
 * Check if a role has sufficient privilege
 */
function hasRolePrivilege(userRole, requiredRole) {
  const userLevel = ROLE_HIERARCHY[userRole] || 0;
  const requiredLevel = ROLE_HIERARCHY[requiredRole] || 0;
  return userLevel >= requiredLevel;
}

/**
 * Check if a stage transition is valid
 */
function isValidStageTransition(fromStage, toStage) {
  const allowedTransitions = STAGE_TRANSITIONS[fromStage];
  return allowedTransitions && allowedTransitions.includes(toStage);
}

/**
 * Get permissions for a role
 */
function getPermissionsForRole(role) {
  const perms = DEFAULT_PERMISSIONS_BY_ROLE[role];
  if (perms === 'all') {
    // Return all permissions as true
    return Object.keys(PERMISSIONS).reduce((acc, key) => {
      acc[PERMISSIONS[key]] = true;
      return acc;
    }, {});
  }
  return perms || {};
}

/**
 * Check if user has a specific permission based on role
 */
function hasPermission(role, permission) {
  const perms = DEFAULT_PERMISSIONS_BY_ROLE[role];
  if (perms === 'all') return true;
  return perms && perms[permission] === true;
}

module.exports = {
  // Roles
  ROLES,
  ROLE_HIERARCHY,
  TEAM_ROLES,
  USER_TYPES,

  // Platforms
  PLATFORMS,
  PLATFORM_LIST,
  PLATFORM_CONFIG,

  // Content stages
  CONTENT_STAGES,
  CONTENT_STAGE_LIST,
  STAGE_TRANSITIONS,
  STAGE_CONFIG,

  // Campaign
  CAMPAIGN_STATUSES,
  CAMPAIGN_STATUS_LIST,

  // Tasks
  TASK_TYPES,
  TASK_STATUSES,
  TASK_PRIORITIES,

  // Permissions
  PERMISSIONS,
  DEFAULT_PERMISSIONS_BY_ROLE,

  // Workflows
  WORKFLOW_PRESETS,

  // Assets
  ASSET_TYPES,
  ASSET_SOURCES,

  // Notifications & Activities
  NOTIFICATION_TYPES,
  ACTIVITY_TYPES,

  // Helper functions
  hasRolePrivilege,
  isValidStageTransition,
  getPermissionsForRole,
  hasPermission
};
