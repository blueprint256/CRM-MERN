const mongoose = require('mongoose');

/**
 * Team Model
 *
 * Represents a collaborative group that shares a workspace.
 * Teams consist of clients, marketeers, and designers working together.
 *
 * Inspired by: Buffer's team collaboration and Frappe CRM's role-based access
 */
const teamSchema = new mongoose.Schema({
  // === IDENTITY ===
  name: {
    type: String,
    required: [true, 'Team name is required'],
    trim: true,
    maxlength: [100, 'Name cannot exceed 100 characters']
  },
  slug: {
    type: String,
    unique: true,
    sparse: true,
    lowercase: true,
    trim: true
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

  // === TEAM MEMBERS ===
  members: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    role: {
      type: String,
      enum: ['client', 'marketeer', 'designer', 'manager', 'owner'],
      required: true
    },
    permissions: {
      // Content permissions
      canCreateContent: { type: Boolean, default: true },
      canEditContent: { type: Boolean, default: true },
      canDeleteContent: { type: Boolean, default: false },
      canPublishContent: { type: Boolean, default: false },
      canApproveContent: { type: Boolean, default: false },

      // Asset permissions
      canUploadAssets: { type: Boolean, default: true },
      canDeleteAssets: { type: Boolean, default: false },

      // Campaign permissions
      canCreateCampaign: { type: Boolean, default: false },
      canEditCampaign: { type: Boolean, default: false },
      canDeleteCampaign: { type: Boolean, default: false },

      // Team permissions
      canInviteMembers: { type: Boolean, default: false },
      canRemoveMembers: { type: Boolean, default: false },
      canChangeRoles: { type: Boolean, default: false },

      // Settings permissions
      canEditSettings: { type: Boolean, default: false }
    },
    // Campaign-specific assignments (optional)
    assignedCampaigns: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Campaign'
    }],
    status: {
      type: String,
      enum: ['active', 'invited', 'suspended'],
      default: 'active'
    },
    invitedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    invitedAt: Date,
    joinedAt: {
      type: Date,
      default: Date.now
    },
    lastActiveAt: Date
  }],

  // === PENDING INVITATIONS ===
  pendingInvitations: [{
    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true
    },
    role: {
      type: String,
      enum: ['client', 'marketeer', 'designer', 'manager'],
      required: true
    },
    invitedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    invitedAt: {
      type: Date,
      default: Date.now
    },
    expiresAt: {
      type: Date,
      default: function() {
        // Invitations expire in 7 days
        return new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
      }
    },
    token: {
      type: String,
      required: true
    },
    message: String
  }],

  // === SETTINGS ===
  settings: {
    // Default permissions for new members by role (stored as Mixed type)
    defaultPermissions: {
      type: mongoose.Schema.Types.Mixed,
      default: {
        client: {
          canCreateContent: false,
          canEditContent: false,
          canDeleteContent: false,
          canPublishContent: false,
          canApproveContent: true,
          canUploadAssets: false,
          canDeleteAssets: false,
          canCreateCampaign: false,
          canEditCampaign: false,
          canDeleteCampaign: false,
          canInviteMembers: false,
          canRemoveMembers: false,
          canChangeRoles: false,
          canEditSettings: false
        },
        designer: {
          canCreateContent: true,
          canEditContent: true,
          canDeleteContent: false,
          canPublishContent: false,
          canApproveContent: false,
          canUploadAssets: true,
          canDeleteAssets: true,
          canCreateCampaign: false,
          canEditCampaign: true,
          canDeleteCampaign: false,
          canInviteMembers: false,
          canRemoveMembers: false,
          canChangeRoles: false,
          canEditSettings: false
        },
        marketeer: {
          canCreateContent: true,
          canEditContent: true,
          canDeleteContent: true,
          canPublishContent: true,
          canApproveContent: false,
          canUploadAssets: true,
          canDeleteAssets: true,
          canCreateCampaign: true,
          canEditCampaign: true,
          canDeleteCampaign: false,
          canInviteMembers: true,
          canRemoveMembers: false,
          canChangeRoles: false,
          canEditSettings: false
        },
        manager: {
          canCreateContent: true,
          canEditContent: true,
          canDeleteContent: true,
          canPublishContent: true,
          canApproveContent: true,
          canUploadAssets: true,
          canDeleteAssets: true,
          canCreateCampaign: true,
          canEditCampaign: true,
          canDeleteCampaign: true,
          canInviteMembers: true,
          canRemoveMembers: true,
          canChangeRoles: true,
          canEditSettings: true
        }
      }
    },
    // Notification preferences
    notifications: {
      emailOnNewMember: { type: Boolean, default: true },
      emailOnMemberLeft: { type: Boolean, default: true },
      slackIntegration: { type: Boolean, default: false }
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
teamSchema.index({ slug: 1 }, { unique: true, sparse: true });
teamSchema.index({ 'members.user': 1 });
teamSchema.index({ workspace: 1 });
teamSchema.index({ status: 1 });
teamSchema.index({ 'pendingInvitations.email': 1 });
teamSchema.index({ 'pendingInvitations.token': 1 });

// === PRE-SAVE HOOKS ===
teamSchema.pre('save', async function(next) {
  // Generate slug from name if not provided
  if (!this.slug && this.name) {
    const baseSlug = this.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');

    let slug = baseSlug;
    let counter = 1;
    while (await mongoose.models.Team.findOne({ slug, _id: { $ne: this._id } })) {
      slug = `${baseSlug}-${counter}`;
      counter++;
    }
    this.slug = slug;
  }

  next();
});

// === VIRTUALS ===
teamSchema.virtual('memberCount').get(function() {
  return this.members.filter(m => m.status === 'active').length;
});

teamSchema.virtual('ownerUser').get(function() {
  const owner = this.members.find(m => m.role === 'owner');
  return owner ? owner.user : null;
});

teamSchema.virtual('activeMembers').get(function() {
  return this.members.filter(m => m.status === 'active');
});

// === INSTANCE METHODS ===

/**
 * Check if a user is a member of this team
 */
teamSchema.methods.isMember = function(userId) {
  return this.members.some(
    m => m.user.toString() === userId.toString() && m.status === 'active'
  );
};

/**
 * Get a member's role in this team
 */
teamSchema.methods.getMemberRole = function(userId) {
  const member = this.members.find(
    m => m.user.toString() === userId.toString() && m.status === 'active'
  );
  return member ? member.role : null;
};

/**
 * Get a member's permissions
 */
teamSchema.methods.getMemberPermissions = function(userId) {
  const member = this.members.find(
    m => m.user.toString() === userId.toString() && m.status === 'active'
  );
  return member ? member.permissions : null;
};

/**
 * Check if a user has a specific permission
 */
teamSchema.methods.hasPermission = function(userId, permission) {
  const member = this.members.find(
    m => m.user.toString() === userId.toString() && m.status === 'active'
  );

  if (!member) return false;

  // Owner has all permissions
  if (member.role === 'owner') return true;

  return member.permissions && member.permissions[permission] === true;
};

/**
 * Add a member to the team
 */
teamSchema.methods.addMember = async function(userId, role, invitedBy, options = {}) {
  // Check if already a member
  const existingMember = this.members.find(
    m => m.user.toString() === userId.toString()
  );

  if (existingMember) {
    if (existingMember.status === 'active') {
      throw new Error('User is already a member of this team');
    }
    // Reactivate suspended member
    existingMember.status = 'active';
    existingMember.role = role;
    existingMember.joinedAt = new Date();
  } else {
    // Get default permissions for role
    const defaultPerms = this.settings.defaultPermissions[role] || {};

    this.members.push({
      user: userId,
      role,
      permissions: { ...defaultPerms, ...options.permissions },
      assignedCampaigns: options.assignedCampaigns || [],
      status: 'active',
      invitedBy,
      invitedAt: new Date(),
      joinedAt: new Date()
    });
  }

  await this.save();
  return this;
};

/**
 * Remove a member from the team
 */
teamSchema.methods.removeMember = async function(userId, removedBy) {
  const memberIndex = this.members.findIndex(
    m => m.user.toString() === userId.toString()
  );

  if (memberIndex === -1) {
    throw new Error('User is not a member of this team');
  }

  const member = this.members[memberIndex];

  // Cannot remove the owner
  if (member.role === 'owner') {
    throw new Error('Cannot remove the team owner');
  }

  // Soft remove - change status to suspended
  this.members[memberIndex].status = 'suspended';

  await this.save();
  return this;
};

/**
 * Update a member's role
 */
teamSchema.methods.updateMemberRole = async function(userId, newRole, updatedBy) {
  const member = this.members.find(
    m => m.user.toString() === userId.toString() && m.status === 'active'
  );

  if (!member) {
    throw new Error('User is not an active member of this team');
  }

  // Cannot change owner role (must transfer ownership)
  if (member.role === 'owner') {
    throw new Error('Cannot change owner role. Transfer ownership instead.');
  }

  member.role = newRole;

  // Update permissions to default for new role
  const defaultPerms = this.settings.defaultPermissions[newRole] || {};
  member.permissions = { ...defaultPerms };

  await this.save();
  return this;
};

/**
 * Transfer ownership to another member
 */
teamSchema.methods.transferOwnership = async function(newOwnerId, currentOwnerId) {
  const currentOwner = this.members.find(
    m => m.user.toString() === currentOwnerId.toString() && m.role === 'owner'
  );

  if (!currentOwner) {
    throw new Error('Current user is not the owner');
  }

  const newOwner = this.members.find(
    m => m.user.toString() === newOwnerId.toString() && m.status === 'active'
  );

  if (!newOwner) {
    throw new Error('New owner must be an active team member');
  }

  // Demote current owner to manager
  currentOwner.role = 'manager';

  // Promote new owner
  newOwner.role = 'owner';

  await this.save();
  return this;
};

/**
 * Create an invitation for a new member
 */
teamSchema.methods.createInvitation = async function(email, role, invitedBy, message = '') {
  const crypto = require('crypto');

  // Check if already invited
  const existingInvitation = this.pendingInvitations.find(
    i => i.email === email.toLowerCase()
  );

  if (existingInvitation) {
    throw new Error('This email has already been invited');
  }

  // Check if already a member
  const User = mongoose.model('User');
  const existingUser = await User.findOne({ email: email.toLowerCase() });
  if (existingUser && this.isMember(existingUser._id)) {
    throw new Error('This user is already a member of this team');
  }

  const token = crypto.randomBytes(32).toString('hex');

  this.pendingInvitations.push({
    email: email.toLowerCase(),
    role,
    invitedBy,
    token,
    message
  });

  await this.save();

  return {
    token,
    email: email.toLowerCase(),
    expiresAt: this.pendingInvitations[this.pendingInvitations.length - 1].expiresAt
  };
};

/**
 * Accept an invitation
 */
teamSchema.methods.acceptInvitation = async function(token, userId) {
  const invitation = this.pendingInvitations.find(i => i.token === token);

  if (!invitation) {
    throw new Error('Invalid invitation token');
  }

  if (new Date() > invitation.expiresAt) {
    // Remove expired invitation
    this.pendingInvitations = this.pendingInvitations.filter(i => i.token !== token);
    await this.save();
    throw new Error('Invitation has expired');
  }

  // Add member
  await this.addMember(userId, invitation.role, invitation.invitedBy);

  // Remove invitation
  this.pendingInvitations = this.pendingInvitations.filter(i => i.token !== token);
  await this.save();

  return this;
};

/**
 * Cancel a pending invitation
 */
teamSchema.methods.cancelInvitation = async function(email) {
  this.pendingInvitations = this.pendingInvitations.filter(
    i => i.email !== email.toLowerCase()
  );
  await this.save();
  return this;
};

/**
 * Get members by role
 */
teamSchema.methods.getMembersByRole = function(role) {
  return this.members.filter(m => m.role === role && m.status === 'active');
};

/**
 * Update member's last active time
 */
teamSchema.methods.updateMemberActivity = async function(userId) {
  const member = this.members.find(
    m => m.user.toString() === userId.toString()
  );

  if (member) {
    member.lastActiveAt = new Date();
    await this.save();
  }

  return this;
};

// === STATIC METHODS ===

/**
 * Find teams for a user
 */
teamSchema.statics.findForUser = async function(userId) {
  return this.find({
    'members.user': userId,
    'members.status': 'active',
    status: 'active'
  }).populate('workspace');
};

/**
 * Find a team by invitation token
 */
teamSchema.statics.findByInvitationToken = async function(token) {
  return this.findOne({
    'pendingInvitations.token': token,
    'pendingInvitations.expiresAt': { $gt: new Date() }
  });
};

/**
 * Create a new team with an owner
 */
teamSchema.statics.createWithOwner = async function(name, ownerUserId, options = {}) {
  const team = new this({
    name,
    description: options.description,
    createdBy: ownerUserId,
    members: [{
      user: ownerUserId,
      role: 'owner',
      permissions: {
        canCreateContent: true,
        canEditContent: true,
        canDeleteContent: true,
        canPublishContent: true,
        canApproveContent: true,
        canUploadAssets: true,
        canDeleteAssets: true,
        canCreateCampaign: true,
        canEditCampaign: true,
        canDeleteCampaign: true,
        canInviteMembers: true,
        canRemoveMembers: true,
        canChangeRoles: true,
        canEditSettings: true
      },
      status: 'active',
      joinedAt: new Date()
    }]
  });

  await team.save();

  // Create workspace for the team
  const Workspace = mongoose.model('Workspace');
  const workspace = await Workspace.createForTeam(team, { _id: ownerUserId }, {
    name: options.workspaceName || `${name} Workspace`
  });

  team.workspace = workspace._id;
  await team.save();

  return team;
};

module.exports = mongoose.model('Team', teamSchema);
