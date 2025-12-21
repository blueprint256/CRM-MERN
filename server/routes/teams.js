const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const Team = require('../models/Team');
const User = require('../models/User');
const Workspace = require('../models/Workspace');
const Activity = require('../models/Activity');

/**
 * Team Routes
 *
 * Manages teams and team memberships for collaborative workspaces
 */

// Get user's teams
router.get('/', authenticate, async (req, res) => {
  try {
    const teams = await Team.findForUser(req.user._id);
    res.json({ teams });
  } catch (error) {
    console.error('Error fetching teams:', error);
    res.status(500).json({ error: 'Failed to fetch teams' });
  }
});

// Get a specific team
router.get('/:id', authenticate, async (req, res) => {
  try {
    const team = await Team.findById(req.params.id)
      .populate('members.user', 'firstName lastName email profilePicture role')
      .populate('workspace');

    if (!team) {
      return res.status(404).json({ error: 'Team not found' });
    }

    // Check if user is a member
    if (!team.isMember(req.user._id) && !req.user.isSystemAdmin) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const userRole = team.getMemberRole(req.user._id);

    res.json({
      team,
      userRole,
      permissions: team.getMemberPermissions(req.user._id)
    });
  } catch (error) {
    console.error('Error fetching team:', error);
    res.status(500).json({ error: 'Failed to fetch team' });
  }
});

// Create a new team
router.post('/', authenticate, async (req, res) => {
  try {
    const { name, description } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Team name is required' });
    }

    const team = await Team.createWithOwner(name, req.user._id, {
      description
    });

    // Add team membership to user
    await req.user.addTeamMembership(team._id, team.workspace, 'owner');

    // Log activity
    const workspace = await Workspace.findById(team.workspace);
    await Activity.logTeam({
      workspace: team.workspace,
      actor: req.user,
      team,
      action: 'member_added',
      member: { user: req.user._id, role: 'owner', name: req.user.fullName }
    });

    res.status(201).json({ team });
  } catch (error) {
    console.error('Error creating team:', error);
    res.status(500).json({ error: 'Failed to create team' });
  }
});

// Update team
router.put('/:id', authenticate, async (req, res) => {
  try {
    const team = await Team.findById(req.params.id);

    if (!team) {
      return res.status(404).json({ error: 'Team not found' });
    }

    // Check permission
    if (!team.hasPermission(req.user._id, 'canEditSettings') && !req.user.isSystemAdmin) {
      return res.status(403).json({ error: 'Permission denied' });
    }

    const { name, description, settings } = req.body;

    if (name) team.name = name;
    if (description !== undefined) team.description = description;
    if (settings) team.settings = { ...team.settings, ...settings };

    await team.save();

    res.json({ team });
  } catch (error) {
    console.error('Error updating team:', error);
    res.status(500).json({ error: 'Failed to update team' });
  }
});

// Get team members
router.get('/:id/members', authenticate, async (req, res) => {
  try {
    const team = await Team.findById(req.params.id)
      .populate('members.user', 'firstName lastName email profilePicture role lastActiveAt');

    if (!team) {
      return res.status(404).json({ error: 'Team not found' });
    }

    if (!team.isMember(req.user._id) && !req.user.isSystemAdmin) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const members = team.members
      .filter(m => m.status === 'active')
      .map(m => ({
        user: m.user,
        role: m.role,
        permissions: m.permissions,
        joinedAt: m.joinedAt,
        lastActiveAt: m.lastActiveAt
      }));

    res.json({ members, pendingInvitations: team.pendingInvitations });
  } catch (error) {
    console.error('Error fetching team members:', error);
    res.status(500).json({ error: 'Failed to fetch team members' });
  }
});

// Invite a new member
router.post('/:id/invite', authenticate, async (req, res) => {
  try {
    const team = await Team.findById(req.params.id);

    if (!team) {
      return res.status(404).json({ error: 'Team not found' });
    }

    // Check permission
    if (!team.hasPermission(req.user._id, 'canInviteMembers') && !req.user.isSystemAdmin) {
      return res.status(403).json({ error: 'Permission denied' });
    }

    const { email, role, message } = req.body;

    if (!email || !role) {
      return res.status(400).json({ error: 'Email and role are required' });
    }

    const validRoles = ['client', 'designer', 'marketeer', 'manager'];
    if (!validRoles.includes(role)) {
      return res.status(400).json({ error: 'Invalid role' });
    }

    const invitation = await team.createInvitation(email, role, req.user._id, message);

    // Log activity
    await Activity.logTeam({
      workspace: team.workspace,
      actor: req.user,
      team,
      action: 'invitation_sent',
      member: { email, role }
    });

    // TODO: Send invitation email

    res.status(201).json({
      message: 'Invitation sent',
      invitation: {
        email: invitation.email,
        expiresAt: invitation.expiresAt
      }
    });
  } catch (error) {
    console.error('Error sending invitation:', error);
    res.status(400).json({ error: error.message || 'Failed to send invitation' });
  }
});

// Accept an invitation
router.post('/accept-invitation', authenticate, async (req, res) => {
  try {
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({ error: 'Invitation token is required' });
    }

    const team = await Team.findByInvitationToken(token);

    if (!team) {
      return res.status(404).json({ error: 'Invalid or expired invitation' });
    }

    await team.acceptInvitation(token, req.user._id);

    // Add team membership to user
    const workspace = await Workspace.findById(team.workspace);
    const invitation = team.pendingInvitations.find(i => i.token === token);

    await req.user.addTeamMembership(team._id, team.workspace, invitation?.role || 'contributor');

    // Log activity
    await Activity.logTeam({
      workspace: team.workspace,
      actor: req.user,
      team,
      action: 'invitation_accepted',
      member: { user: req.user._id, role: invitation?.role, name: req.user.fullName }
    });

    res.json({
      message: 'Invitation accepted',
      team: { _id: team._id, name: team.name },
      workspace: { _id: workspace._id, name: workspace.name }
    });
  } catch (error) {
    console.error('Error accepting invitation:', error);
    res.status(400).json({ error: error.message || 'Failed to accept invitation' });
  }
});

// Cancel an invitation
router.delete('/:id/invitations/:email', authenticate, async (req, res) => {
  try {
    const team = await Team.findById(req.params.id);

    if (!team) {
      return res.status(404).json({ error: 'Team not found' });
    }

    if (!team.hasPermission(req.user._id, 'canInviteMembers') && !req.user.isSystemAdmin) {
      return res.status(403).json({ error: 'Permission denied' });
    }

    await team.cancelInvitation(req.params.email);

    // Log activity
    await Activity.logTeam({
      workspace: team.workspace,
      actor: req.user,
      team,
      action: 'invitation_cancelled',
      member: { email: req.params.email }
    });

    res.json({ message: 'Invitation cancelled' });
  } catch (error) {
    console.error('Error cancelling invitation:', error);
    res.status(500).json({ error: 'Failed to cancel invitation' });
  }
});

// Update a member's role
router.put('/:id/members/:userId', authenticate, async (req, res) => {
  try {
    const team = await Team.findById(req.params.id);

    if (!team) {
      return res.status(404).json({ error: 'Team not found' });
    }

    if (!team.hasPermission(req.user._id, 'canChangeRoles') && !req.user.isSystemAdmin) {
      return res.status(403).json({ error: 'Permission denied' });
    }

    const { role, permissions } = req.body;

    if (role) {
      await team.updateMemberRole(req.params.userId, role, req.user._id);
    }

    if (permissions) {
      const member = team.members.find(m => m.user.toString() === req.params.userId);
      if (member) {
        member.permissions = { ...member.permissions, ...permissions };
        await team.save();
      }
    }

    // Update user's team membership
    const user = await User.findById(req.params.userId);
    if (user && role) {
      const membership = user.teamMemberships.find(
        m => m.team.toString() === team._id.toString()
      );
      if (membership) {
        membership.role = role;
        await user.save();
      }
    }

    // Log activity
    await Activity.logTeam({
      workspace: team.workspace,
      actor: req.user,
      team,
      action: 'member_role_changed',
      member: { user: req.params.userId, role },
      metadata: { memberRole: role }
    });

    res.json({ message: 'Member updated', team });
  } catch (error) {
    console.error('Error updating member:', error);
    res.status(400).json({ error: error.message || 'Failed to update member' });
  }
});

// Remove a member
router.delete('/:id/members/:userId', authenticate, async (req, res) => {
  try {
    const team = await Team.findById(req.params.id);

    if (!team) {
      return res.status(404).json({ error: 'Team not found' });
    }

    // Users can remove themselves, otherwise need permission
    const isSelf = req.params.userId === req.user._id.toString();
    if (!isSelf && !team.hasPermission(req.user._id, 'canRemoveMembers') && !req.user.isSystemAdmin) {
      return res.status(403).json({ error: 'Permission denied' });
    }

    const memberToRemove = team.members.find(m => m.user.toString() === req.params.userId);

    await team.removeMember(req.params.userId, req.user._id);

    // Remove team membership from user
    const user = await User.findById(req.params.userId);
    if (user) {
      await user.removeTeamMembership(team._id);
    }

    // Log activity
    await Activity.logTeam({
      workspace: team.workspace,
      actor: req.user,
      team,
      action: 'member_removed',
      member: { user: req.params.userId, role: memberToRemove?.role }
    });

    res.json({ message: 'Member removed' });
  } catch (error) {
    console.error('Error removing member:', error);
    res.status(400).json({ error: error.message || 'Failed to remove member' });
  }
});

// Transfer ownership
router.post('/:id/transfer-ownership', authenticate, async (req, res) => {
  try {
    const team = await Team.findById(req.params.id);

    if (!team) {
      return res.status(404).json({ error: 'Team not found' });
    }

    const userRole = team.getMemberRole(req.user._id);
    if (userRole !== 'owner' && !req.user.isSystemAdmin) {
      return res.status(403).json({ error: 'Only the owner can transfer ownership' });
    }

    const { newOwnerId } = req.body;

    if (!newOwnerId) {
      return res.status(400).json({ error: 'New owner ID is required' });
    }

    await team.transferOwnership(newOwnerId, req.user._id);

    // Update workspace owner if applicable
    const workspace = await Workspace.findById(team.workspace);
    if (workspace && workspace.type === 'team') {
      // Team workspaces don't have an owner field, they reference the team
    }

    // Update user memberships
    const newOwner = await User.findById(newOwnerId);
    if (newOwner) {
      const membership = newOwner.teamMemberships.find(
        m => m.team.toString() === team._id.toString()
      );
      if (membership) {
        membership.role = 'owner';
        await newOwner.save();
      }
    }

    const oldOwnerMembership = req.user.teamMemberships.find(
      m => m.team.toString() === team._id.toString()
    );
    if (oldOwnerMembership) {
      oldOwnerMembership.role = 'manager';
      await req.user.save();
    }

    res.json({ message: 'Ownership transferred', team });
  } catch (error) {
    console.error('Error transferring ownership:', error);
    res.status(400).json({ error: error.message || 'Failed to transfer ownership' });
  }
});

module.exports = router;
