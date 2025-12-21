const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middleware/auth');
const Workspace = require('../models/Workspace');
const Team = require('../models/Team');
const User = require('../models/User');
const Activity = require('../models/Activity');

/**
 * Workspace Routes
 *
 * Manages workspaces - the organizational boundary for all content and assets
 */

// Get current user's workspaces
router.get('/', authenticate, async (req, res) => {
  try {
    const workspaces = await req.user.getAccessibleWorkspaces();
    res.json({ workspaces });
  } catch (error) {
    console.error('Error fetching workspaces:', error);
    res.status(500).json({ error: 'Failed to fetch workspaces' });
  }
});

// Get a specific workspace
router.get('/:id', authenticate, async (req, res) => {
  try {
    const workspace = await Workspace.findById(req.params.id)
      .populate('owner', 'firstName lastName email profilePicture')
      .populate('team')
      .populate('defaultWorkflow')
      .populate('branding.logo');

    if (!workspace) {
      return res.status(404).json({ error: 'Workspace not found' });
    }

    // Check access
    const hasAccess = await workspace.hasAccess(req.user._id);
    if (!hasAccess && !req.user.isSystemAdmin) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Get user's role in this workspace
    const userRole = await workspace.getUserRole(req.user._id);

    res.json({
      workspace,
      userRole,
      permissions: {
        canEdit: ['owner', 'manager'].includes(userRole) || req.user.isSystemAdmin,
        canDelete: userRole === 'owner' || req.user.isSystemAdmin,
        canInvite: ['owner', 'manager', 'marketeer'].includes(userRole),
        canManageSettings: ['owner', 'manager'].includes(userRole)
      }
    });
  } catch (error) {
    console.error('Error fetching workspace:', error);
    res.status(500).json({ error: 'Failed to fetch workspace' });
  }
});

// Create a new workspace (for hybrid users or new teams)
router.post('/', authenticate, async (req, res) => {
  try {
    const { name, type, description } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Workspace name is required' });
    }

    let workspace;

    if (type === 'team') {
      // Create team first, then workspace
      const team = await Team.createWithOwner(name, req.user._id, {
        description,
        workspaceName: `${name} Workspace`
      });

      workspace = await Workspace.findById(team.workspace);

      // Add team membership to user
      await req.user.addTeamMembership(team._id, workspace._id, 'owner');

    } else {
      // Create hybrid workspace
      workspace = await Workspace.createForHybridUser(req.user, {
        name,
        description
      });

      // Update user's workspace reference
      req.user.workspace = workspace._id;
      await req.user.save();
    }

    // Log activity
    await Activity.create({
      workspace: workspace._id,
      actor: req.user._id,
      action: 'workspace.created',
      description: `Created workspace "${workspace.name}"`,
      targetType: 'workspace',
      targetId: workspace._id,
      targetName: workspace.name,
      isSignificant: true
    });

    res.status(201).json({ workspace });
  } catch (error) {
    console.error('Error creating workspace:', error);
    res.status(500).json({ error: 'Failed to create workspace' });
  }
});

// Update workspace settings
router.put('/:id', authenticate, async (req, res) => {
  try {
    const workspace = await Workspace.findById(req.params.id);

    if (!workspace) {
      return res.status(404).json({ error: 'Workspace not found' });
    }

    // Check permission
    const userRole = await workspace.getUserRole(req.user._id);
    if (!['owner', 'manager'].includes(userRole) && !req.user.isSystemAdmin) {
      return res.status(403).json({ error: 'Only owners and managers can update workspace settings' });
    }

    const allowedUpdates = [
      'name', 'description', 'branding', 'scheduling',
      'notifications', 'approvalSettings', 'integrations'
    ];

    const updates = {};
    for (const field of allowedUpdates) {
      if (req.body[field] !== undefined) {
        updates[field] = req.body[field];
      }
    }

    Object.assign(workspace, updates);
    await workspace.save();

    // Log activity
    await Activity.create({
      workspace: workspace._id,
      actor: req.user._id,
      action: 'workspace.settings_updated',
      description: `Updated workspace settings`,
      targetType: 'workspace',
      targetId: workspace._id,
      targetName: workspace.name
    });

    res.json({ workspace });
  } catch (error) {
    console.error('Error updating workspace:', error);
    res.status(500).json({ error: 'Failed to update workspace' });
  }
});

// Get workspace statistics
router.get('/:id/stats', authenticate, async (req, res) => {
  try {
    const workspace = await Workspace.findById(req.params.id);

    if (!workspace) {
      return res.status(404).json({ error: 'Workspace not found' });
    }

    const hasAccess = await workspace.hasAccess(req.user._id);
    if (!hasAccess && !req.user.isSystemAdmin) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Update and return stats
    await workspace.updateStats();

    res.json({ stats: workspace.stats });
  } catch (error) {
    console.error('Error fetching workspace stats:', error);
    res.status(500).json({ error: 'Failed to fetch workspace stats' });
  }
});

// Get workspace activity feed
router.get('/:id/activity', authenticate, async (req, res) => {
  try {
    const workspace = await Workspace.findById(req.params.id);

    if (!workspace) {
      return res.status(404).json({ error: 'Workspace not found' });
    }

    const hasAccess = await workspace.hasAccess(req.user._id);
    if (!hasAccess && !req.user.isSystemAdmin) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const { limit = 50, before, significantOnly } = req.query;

    const activities = await Activity.getFeed(workspace._id, {
      limit: parseInt(limit),
      before,
      significantOnly: significantOnly === 'true'
    });

    res.json({ activities });
  } catch (error) {
    console.error('Error fetching activity:', error);
    res.status(500).json({ error: 'Failed to fetch activity' });
  }
});

// Connect a platform to workspace
router.post('/:id/platforms', authenticate, async (req, res) => {
  try {
    const workspace = await Workspace.findById(req.params.id);

    if (!workspace) {
      return res.status(404).json({ error: 'Workspace not found' });
    }

    const userRole = await workspace.getUserRole(req.user._id);
    if (!['owner', 'manager'].includes(userRole) && !req.user.isSystemAdmin) {
      return res.status(403).json({ error: 'Permission denied' });
    }

    const { platform, customName, customIcon } = req.body;

    if (!platform) {
      return res.status(400).json({ error: 'Platform is required' });
    }

    // Check if platform already exists
    const existingPlatform = workspace.platforms.find(p => p.platform === platform);
    if (existingPlatform) {
      return res.status(400).json({ error: 'Platform already connected' });
    }

    workspace.platforms.push({
      platform,
      enabled: true,
      customName: platform === 'custom' ? customName : undefined,
      customIcon: platform === 'custom' ? customIcon : undefined
    });

    await workspace.save();

    // Log activity
    await Activity.create({
      workspace: workspace._id,
      actor: req.user._id,
      action: 'workspace.platform_connected',
      description: `Connected ${platform} to workspace`,
      targetType: 'workspace',
      targetId: workspace._id,
      targetName: workspace.name,
      metadata: { platform }
    });

    res.json({ workspace });
  } catch (error) {
    console.error('Error connecting platform:', error);
    res.status(500).json({ error: 'Failed to connect platform' });
  }
});

// Disconnect a platform from workspace
router.delete('/:id/platforms/:platform', authenticate, async (req, res) => {
  try {
    const workspace = await Workspace.findById(req.params.id);

    if (!workspace) {
      return res.status(404).json({ error: 'Workspace not found' });
    }

    const userRole = await workspace.getUserRole(req.user._id);
    if (!['owner', 'manager'].includes(userRole) && !req.user.isSystemAdmin) {
      return res.status(403).json({ error: 'Permission denied' });
    }

    workspace.platforms = workspace.platforms.filter(
      p => p.platform !== req.params.platform
    );

    await workspace.save();

    // Log activity
    await Activity.create({
      workspace: workspace._id,
      actor: req.user._id,
      action: 'workspace.platform_disconnected',
      description: `Disconnected ${req.params.platform} from workspace`,
      targetType: 'workspace',
      targetId: workspace._id,
      targetName: workspace.name,
      metadata: { platform: req.params.platform }
    });

    res.json({ workspace });
  } catch (error) {
    console.error('Error disconnecting platform:', error);
    res.status(500).json({ error: 'Failed to disconnect platform' });
  }
});

// Archive workspace
router.post('/:id/archive', authenticate, async (req, res) => {
  try {
    const workspace = await Workspace.findById(req.params.id);

    if (!workspace) {
      return res.status(404).json({ error: 'Workspace not found' });
    }

    const userRole = await workspace.getUserRole(req.user._id);
    if (userRole !== 'owner' && !req.user.isSystemAdmin) {
      return res.status(403).json({ error: 'Only the owner can archive a workspace' });
    }

    workspace.status = 'archived';
    await workspace.save();

    res.json({ message: 'Workspace archived', workspace });
  } catch (error) {
    console.error('Error archiving workspace:', error);
    res.status(500).json({ error: 'Failed to archive workspace' });
  }
});

module.exports = router;
