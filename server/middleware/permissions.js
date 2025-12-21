const mongoose = require('mongoose');
const {
  ROLES,
  ROLE_HIERARCHY,
  PERMISSIONS,
  hasRolePrivilege,
  hasPermission,
  USER_TYPES
} = require('../config/constants');

/**
 * Unified Permission Middleware
 *
 * Provides consistent authorization across all API routes.
 * Handles workspace-level, team-level, and resource-level permissions.
 */

/**
 * Require authentication
 * This should already be done by auth middleware, but provides a safety check
 */
const requireAuth = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  next();
};

/**
 * Require system admin access
 */
const requireSystemAdmin = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  if (req.user.userType !== USER_TYPES.SYSTEM_ADMIN) {
    return res.status(403).json({ error: 'System administrator access required' });
  }

  next();
};

/**
 * Require minimum role level
 * @param {string} minimumRole - The minimum role required
 */
const requireRole = (minimumRole) => {
  return async (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    // System admins always pass
    if (req.user.userType === USER_TYPES.SYSTEM_ADMIN) {
      return next();
    }

    // Get workspace ID from request (body, params, or query)
    const workspaceId = req.body.workspace || req.params.workspaceId || req.query.workspace;

    if (!workspaceId) {
      return res.status(400).json({ error: 'Workspace ID required' });
    }

    try {
      const userRole = await getUserRoleInWorkspace(req.user, workspaceId);

      if (!userRole) {
        return res.status(403).json({ error: 'No access to this workspace' });
      }

      if (!hasRolePrivilege(userRole, minimumRole)) {
        return res.status(403).json({
          error: `Insufficient permissions. Required: ${minimumRole}, Current: ${userRole}`
        });
      }

      // Attach role to request for downstream use
      req.userRole = userRole;
      req.workspaceId = workspaceId;
      next();
    } catch (error) {
      console.error('Role check error:', error);
      return res.status(500).json({ error: 'Authorization check failed' });
    }
  };
};

/**
 * Require specific permission
 * @param {string} permission - The permission to check
 */
const requirePermission = (permission) => {
  return async (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    // System admins always have all permissions
    if (req.user.userType === USER_TYPES.SYSTEM_ADMIN) {
      return next();
    }

    const workspaceId = req.body.workspace || req.params.workspaceId || req.query.workspace;

    if (!workspaceId) {
      return res.status(400).json({ error: 'Workspace ID required' });
    }

    try {
      const userRole = await getUserRoleInWorkspace(req.user, workspaceId);

      if (!userRole) {
        return res.status(403).json({ error: 'No access to this workspace' });
      }

      if (!hasPermission(userRole, permission)) {
        return res.status(403).json({
          error: `Permission denied: ${permission}`
        });
      }

      req.userRole = userRole;
      req.workspaceId = workspaceId;
      next();
    } catch (error) {
      console.error('Permission check error:', error);
      return res.status(500).json({ error: 'Authorization check failed' });
    }
  };
};

/**
 * Require workspace access (any role)
 */
const requireWorkspaceAccess = async (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  // System admins can access any workspace
  if (req.user.userType === USER_TYPES.SYSTEM_ADMIN) {
    return next();
  }

  const workspaceId = req.body.workspace || req.params.workspaceId || req.query.workspace || req.params.id;

  if (!workspaceId) {
    return res.status(400).json({ error: 'Workspace ID required' });
  }

  try {
    const userRole = await getUserRoleInWorkspace(req.user, workspaceId);

    if (!userRole) {
      return res.status(403).json({ error: 'No access to this workspace' });
    }

    req.userRole = userRole;
    req.workspaceId = workspaceId;
    next();
  } catch (error) {
    console.error('Workspace access check error:', error);
    return res.status(500).json({ error: 'Authorization check failed' });
  }
};

/**
 * Require campaign access
 */
const requireCampaignAccess = (minimumRole = ROLES.VIEWER) => {
  return async (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    // System admins always pass
    if (req.user.userType === USER_TYPES.SYSTEM_ADMIN) {
      return next();
    }

    const campaignId = req.params.campaignId || req.params.id || req.body.campaign;

    if (!campaignId) {
      return res.status(400).json({ error: 'Campaign ID required' });
    }

    try {
      const Campaign = mongoose.model('Campaign');
      const campaign = await Campaign.findById(campaignId);

      if (!campaign) {
        return res.status(404).json({ error: 'Campaign not found' });
      }

      // Check if user is owner
      if (campaign.owner.toString() === req.user._id.toString()) {
        req.userRole = ROLES.OWNER;
        req.campaign = campaign;
        return next();
      }

      // Check team membership
      const teamMember = campaign.team.find(
        t => t.user.toString() === req.user._id.toString()
      );

      if (teamMember) {
        if (!hasRolePrivilege(teamMember.role, minimumRole)) {
          return res.status(403).json({ error: 'Insufficient campaign permissions' });
        }
        req.userRole = teamMember.role;
        req.campaign = campaign;
        return next();
      }

      // Check if user is the client
      if (campaign.client && campaign.client.toString() === req.user._id.toString()) {
        req.userRole = ROLES.VIEWER;
        req.campaign = campaign;
        return next();
      }

      return res.status(403).json({ error: 'No access to this campaign' });
    } catch (error) {
      console.error('Campaign access check error:', error);
      return res.status(500).json({ error: 'Authorization check failed' });
    }
  };
};

/**
 * Require content access
 */
const requireContentAccess = (minimumRole = ROLES.VIEWER) => {
  return async (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    if (req.user.userType === USER_TYPES.SYSTEM_ADMIN) {
      return next();
    }

    const contentId = req.params.contentId || req.params.id;

    if (!contentId) {
      return res.status(400).json({ error: 'Content ID required' });
    }

    try {
      const Content = mongoose.model('Content');
      const content = await Content.findById(contentId);

      if (!content) {
        return res.status(404).json({ error: 'Content not found' });
      }

      // Check if user is creator
      if (content.createdBy.toString() === req.user._id.toString()) {
        req.userRole = ROLES.OWNER;
        req.content = content;
        return next();
      }

      // Check if user is assigned
      if (content.assignedTo && content.assignedTo.toString() === req.user._id.toString()) {
        req.userRole = ROLES.CONTRIBUTOR;
        req.content = content;
        return next();
      }

      // Check if user is a reviewer
      if (content.reviewers && content.reviewers.some(r => r.toString() === req.user._id.toString())) {
        req.userRole = ROLES.MANAGER;
        req.content = content;
        return next();
      }

      // Check workspace access
      if (content.workspace) {
        const userRole = await getUserRoleInWorkspace(req.user, content.workspace);
        if (userRole && hasRolePrivilege(userRole, minimumRole)) {
          req.userRole = userRole;
          req.content = content;
          return next();
        }
      }

      // Check campaign access
      if (content.campaign) {
        const Campaign = mongoose.model('Campaign');
        const campaign = await Campaign.findById(content.campaign);
        if (campaign) {
          const teamMember = campaign.team.find(
            t => t.user.toString() === req.user._id.toString()
          );
          if (teamMember && hasRolePrivilege(teamMember.role, minimumRole)) {
            req.userRole = teamMember.role;
            req.content = content;
            return next();
          }
        }
      }

      return res.status(403).json({ error: 'No access to this content' });
    } catch (error) {
      console.error('Content access check error:', error);
      return res.status(500).json({ error: 'Authorization check failed' });
    }
  };
};

/**
 * Check if user can perform approval (for hybrid users, auto-approve)
 */
const canAutoApprove = async (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  // Hybrid users can auto-approve their own content
  if (req.user.userType === USER_TYPES.HYBRID) {
    req.canAutoApprove = true;
    return next();
  }

  // System admins can auto-approve
  if (req.user.userType === USER_TYPES.SYSTEM_ADMIN) {
    req.canAutoApprove = true;
    return next();
  }

  // Check workspace settings
  const workspaceId = req.body.workspace || req.params.workspaceId || req.query.workspace;
  if (workspaceId) {
    try {
      const Workspace = mongoose.model('Workspace');
      const workspace = await Workspace.findById(workspaceId);

      if (workspace && !workspace.approvalSettings.requireApproval) {
        req.canAutoApprove = true;
        return next();
      }

      // Check if user's role can auto-approve
      const userRole = await getUserRoleInWorkspace(req.user, workspaceId);
      if (workspace && workspace.approvalSettings.autoApproveForRoles) {
        if (workspace.approvalSettings.autoApproveForRoles.includes(userRole)) {
          req.canAutoApprove = true;
          return next();
        }
      }
    } catch (error) {
      console.error('Auto-approve check error:', error);
    }
  }

  req.canAutoApprove = false;
  next();
};

/**
 * Get user's role in a workspace
 */
async function getUserRoleInWorkspace(user, workspaceId) {
  // Check if user owns the workspace (hybrid user)
  if (user.workspace && user.workspace.toString() === workspaceId.toString()) {
    return ROLES.OWNER;
  }

  // Check team memberships
  const membership = user.teamMemberships.find(
    m => m.workspace && m.workspace.toString() === workspaceId.toString()
  );

  if (membership) {
    return membership.role;
  }

  // Check if workspace belongs to user's team
  const Workspace = mongoose.model('Workspace');
  const workspace = await Workspace.findById(workspaceId);

  if (workspace && workspace.team) {
    const Team = mongoose.model('Team');
    const team = await Team.findById(workspace.team);

    if (team) {
      const member = team.members.find(
        m => m.user.toString() === user._id.toString() && m.status === 'active'
      );
      if (member) {
        return member.role;
      }
    }
  }

  return null;
}

/**
 * Middleware to attach workspace context to request
 */
const attachWorkspaceContext = async (req, res, next) => {
  // Try to get workspace ID from various sources
  const workspaceId = req.body.workspace ||
    req.params.workspaceId ||
    req.query.workspace ||
    req.headers['x-workspace-id'];

  if (workspaceId) {
    try {
      const Workspace = mongoose.model('Workspace');
      const workspace = await Workspace.findById(workspaceId);

      if (workspace) {
        req.workspace = workspace;

        // Also attach user's role in this workspace
        if (req.user) {
          req.userRole = await getUserRoleInWorkspace(req.user, workspaceId);
        }
      }
    } catch (error) {
      console.error('Workspace context error:', error);
    }
  }

  // For hybrid users without explicit workspace, use their default
  if (!req.workspace && req.user && req.user.userType === USER_TYPES.HYBRID && req.user.workspace) {
    try {
      const Workspace = mongoose.model('Workspace');
      req.workspace = await Workspace.findById(req.user.workspace);
      req.userRole = ROLES.OWNER;
    } catch (error) {
      console.error('Default workspace error:', error);
    }
  }

  next();
};

/**
 * Check if user can edit the specified resource
 * Used for content/campaign/asset edit operations
 */
const canEdit = (resourceType) => {
  const permissionMap = {
    content: PERMISSIONS.EDIT_CONTENT,
    campaign: PERMISSIONS.EDIT_CAMPAIGN,
    asset: PERMISSIONS.EDIT_ASSETS
  };

  return requirePermission(permissionMap[resourceType] || PERMISSIONS.EDIT_CONTENT);
};

/**
 * Check if user can delete the specified resource
 */
const canDelete = (resourceType) => {
  const permissionMap = {
    content: PERMISSIONS.DELETE_CONTENT,
    campaign: PERMISSIONS.DELETE_CAMPAIGN,
    asset: PERMISSIONS.DELETE_ASSETS
  };

  return requirePermission(permissionMap[resourceType] || PERMISSIONS.DELETE_CONTENT);
};

/**
 * Combined middleware for common patterns
 */
const workspaceMember = [requireAuth, requireWorkspaceAccess];
const workspaceManager = [requireAuth, requireRole(ROLES.MANAGER)];
const workspaceOwner = [requireAuth, requireRole(ROLES.OWNER)];

module.exports = {
  requireAuth,
  requireSystemAdmin,
  requireRole,
  requirePermission,
  requireWorkspaceAccess,
  requireCampaignAccess,
  requireContentAccess,
  canAutoApprove,
  attachWorkspaceContext,
  canEdit,
  canDelete,

  // Combined middleware
  workspaceMember,
  workspaceManager,
  workspaceOwner,

  // Helper function export
  getUserRoleInWorkspace
};
