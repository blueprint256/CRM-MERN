const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

/**
 * User Model
 *
 * Unified user model supporting three user types:
 * - system_admin: Full platform control
 * - hybrid: Solo marketers with their own workspace
 * - team_member: Collaborative users within team workspaces
 *
 * Inspired by: Frappe CRM's user management and Buffer's team structure
 */
const userSchema = new mongoose.Schema({
  // === IDENTITY ===
  username: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true,
    index: true
  },
  firstName: {
    type: String,
    required: true,
    trim: true
  },
  lastName: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
    index: true
  },
  profilePicture: {
    type: String,
    default: null
  },
  phone: {
    type: String,
    trim: true
  },
  bio: {
    type: String,
    maxlength: 500
  },

  // === USER TYPE (New Architecture) ===
  userType: {
    type: String,
    enum: ['system_admin', 'hybrid', 'team_member'],
    default: 'team_member',
    index: true
  },

  // Legacy role field - kept for backward compatibility
  // Maps: system -> system_admin, hybrid -> hybrid, others -> team_member
  role: {
    type: String,
    enum: ['system', 'designer', 'marketeer', 'client', 'hybrid'],
    default: 'client',
    index: true
  },

  // === WORKSPACE (For Hybrid Users) ===
  // Hybrid users own their personal workspace
  workspace: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Workspace'
  },

  // === TEAM MEMBERSHIPS (For Team Members) ===
  // A user can be a member of multiple teams
  teamMemberships: [{
    team: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Team'
    },
    workspace: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Workspace'
    },
    role: {
      type: String,
      enum: ['client', 'designer', 'marketeer', 'manager', 'owner']
    },
    joinedAt: {
      type: Date,
      default: Date.now
    },
    isDefault: {
      type: Boolean,
      default: false
    }
  }],

  // === AUTHENTICATION ===
  passwordHash: {
    type: String,
    required: true
  },
  createPassword: {
    type: Boolean,
    default: false
  },
  requirePasswordChange: {
    type: Boolean,
    default: false
  },
  passwordChangedAt: Date,
  passwordResetToken: String,
  passwordResetExpires: Date,

  // OAuth providers
  authProvider: {
    type: String,
    enum: ['local', 'google', 'microsoft', 'linkedin'],
    default: 'local'
  },
  googleId: {
    type: String,
    unique: true,
    sparse: true,
    index: true
  },
  microsoftId: {
    type: String,
    unique: true,
    sparse: true
  },

  // === INTEGRATIONS ===
  integrations: {
    canva: {
      accessToken: String,
      refreshToken: String,
      tokenExpiresAt: Date,
      userId: String,
      connectedAt: Date
    },
    google: {
      accessToken: String,
      refreshToken: String,
      tokenExpiresAt: Date
    }
  },

  // Legacy Canva fields - kept for backward compatibility
  canvaAccessToken: {
    type: String,
    default: null
  },
  canvaRefreshToken: {
    type: String,
    default: null
  },
  canvaTokenExpiresAt: {
    type: Date,
    default: null
  },
  canvaUserId: {
    type: String,
    default: null
  },

  // === PREFERENCES ===
  preferences: {
    timezone: {
      type: String,
      default: 'UTC'
    },
    language: {
      type: String,
      default: 'en'
    },
    dateFormat: {
      type: String,
      default: 'MM/DD/YYYY'
    },
    timeFormat: {
      type: String,
      enum: ['12h', '24h'],
      default: '12h'
    },
    theme: {
      type: String,
      enum: ['light', 'dark', 'system'],
      default: 'system'
    },
    // Email notification preferences
    emailNotifications: {
      contentApproved: { type: Boolean, default: true },
      contentRejected: { type: Boolean, default: true },
      contentAssigned: { type: Boolean, default: true },
      contentPublished: { type: Boolean, default: true },
      contentFailed: { type: Boolean, default: true },
      newComment: { type: Boolean, default: true },
      teamInvitation: { type: Boolean, default: true },
      weeklyDigest: { type: Boolean, default: true }
    },
    // Default workspace to show on login
    defaultWorkspace: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Workspace'
    }
  },

  // === ACTIVITY TRACKING ===
  lastLoginAt: Date,
  lastActiveAt: Date,
  loginCount: {
    type: Number,
    default: 0
  },
  lastLoginIp: String,
  lastLoginDevice: String,

  // === STATUS ===
  status: {
    type: String,
    enum: ['active', 'inactive', 'suspended', 'pending'],
    default: 'active',
    index: true
  },
  suspendedAt: Date,
  suspendedReason: String,
  suspendedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },

  // === ONBOARDING ===
  onboarding: {
    completed: {
      type: Boolean,
      default: false
    },
    completedAt: Date,
    steps: {
      profileComplete: { type: Boolean, default: false },
      workspaceCreated: { type: Boolean, default: false },
      firstContentCreated: { type: Boolean, default: false },
      platformConnected: { type: Boolean, default: false },
      firstPostPublished: { type: Boolean, default: false }
    }
  },

  // === METADATA ===
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  invitedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  invitationToken: String,
  invitationExpires: Date

}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// === INDEXES ===
userSchema.index({ userType: 1, status: 1 });
userSchema.index({ 'teamMemberships.team': 1 });
userSchema.index({ 'teamMemberships.workspace': 1 });
userSchema.index({ workspace: 1 });
userSchema.index({ status: 1, lastActiveAt: -1 });

// === PRE-SAVE HOOKS ===

// Hash password before saving
userSchema.pre('save', async function(next) {
  // Sync userType with legacy role
  if (this.isModified('role')) {
    if (this.role === 'system') {
      this.userType = 'system_admin';
    } else if (this.role === 'hybrid') {
      this.userType = 'hybrid';
    } else {
      this.userType = 'team_member';
    }
  }

  // Hash password if modified
  if (!this.isModified('passwordHash')) return next();

  // Skip hashing for OAuth placeholder passwords
  if (this.passwordHash === 'oauth_no_password') {
    return next();
  }

  try {
    const salt = await bcrypt.genSalt(10);
    this.passwordHash = await bcrypt.hash(this.passwordHash, salt);
    this.passwordChangedAt = new Date();
    next();
  } catch (error) {
    next(error);
  }
});

// === VIRTUALS ===

userSchema.virtual('fullName').get(function() {
  return `${this.firstName} ${this.lastName}`;
});

userSchema.virtual('initials').get(function() {
  return `${this.firstName[0]}${this.lastName[0]}`.toUpperCase();
});

userSchema.virtual('isSystemAdmin').get(function() {
  return this.userType === 'system_admin' || this.role === 'system';
});

userSchema.virtual('isHybrid').get(function() {
  return this.userType === 'hybrid' || this.role === 'hybrid';
});

userSchema.virtual('isTeamMember').get(function() {
  return this.userType === 'team_member' && !['system', 'hybrid'].includes(this.role);
});

userSchema.virtual('hasWorkspace').get(function() {
  return this.workspace || this.teamMemberships.length > 0;
});

// Virtual populate for workspace details
userSchema.virtual('workspaceDetails', {
  ref: 'Workspace',
  localField: 'workspace',
  foreignField: '_id',
  justOne: true
});

// === INSTANCE METHODS ===

/**
 * Check password
 */
userSchema.methods.checkPassword = async function(password) {
  if (this.authProvider !== 'local' && this.passwordHash === 'oauth_no_password') {
    return false;
  }
  return bcrypt.compare(password, this.passwordHash);
};

/**
 * Set new password
 */
userSchema.methods.setPassword = async function(password) {
  const salt = await bcrypt.genSalt(10);
  this.passwordHash = await bcrypt.hash(password, salt);
  this.authProvider = 'local';
  this.requirePasswordChange = false;
  this.passwordChangedAt = new Date();
};

/**
 * Check if user can use password login
 */
userSchema.methods.canUsePasswordLogin = function() {
  return this.authProvider === 'local' || this.passwordHash !== 'oauth_no_password';
};

/**
 * Get all workspaces user has access to
 */
userSchema.methods.getAccessibleWorkspaces = async function() {
  const Workspace = mongoose.model('Workspace');
  const workspaces = [];

  // Own workspace (for hybrid users)
  if (this.workspace) {
    const ownWorkspace = await Workspace.findById(this.workspace);
    if (ownWorkspace) {
      workspaces.push({
        workspace: ownWorkspace,
        role: 'owner',
        isOwn: true
      });
    }
  }

  // Team workspaces
  for (const membership of this.teamMemberships) {
    const workspace = await Workspace.findById(membership.workspace);
    if (workspace && workspace.status === 'active') {
      workspaces.push({
        workspace,
        role: membership.role,
        team: membership.team,
        isOwn: false
      });
    }
  }

  return workspaces;
};

/**
 * Get user's role in a specific workspace
 */
userSchema.methods.getRoleInWorkspace = async function(workspaceId) {
  // Check if user owns the workspace
  if (this.workspace && this.workspace.toString() === workspaceId.toString()) {
    return 'owner';
  }

  // Check team memberships
  const membership = this.teamMemberships.find(
    m => m.workspace && m.workspace.toString() === workspaceId.toString()
  );

  return membership ? membership.role : null;
};

/**
 * Check if user has access to a workspace
 */
userSchema.methods.hasAccessToWorkspace = async function(workspaceId, requiredRole = null) {
  const role = await this.getRoleInWorkspace(workspaceId);

  if (!role) return false;
  if (!requiredRole) return true;

  const roleHierarchy = {
    'viewer': 1,
    'client': 2,
    'contributor': 3,
    'designer': 4,
    'marketeer': 5,
    'manager': 6,
    'owner': 7
  };

  return roleHierarchy[role] >= roleHierarchy[requiredRole];
};

/**
 * Add team membership
 */
userSchema.methods.addTeamMembership = async function(teamId, workspaceId, role) {
  // Check if already a member
  const existing = this.teamMemberships.find(
    m => m.team.toString() === teamId.toString()
  );

  if (existing) {
    throw new Error('Already a member of this team');
  }

  this.teamMemberships.push({
    team: teamId,
    workspace: workspaceId,
    role,
    joinedAt: new Date(),
    isDefault: this.teamMemberships.length === 0
  });

  await this.save();
  return this;
};

/**
 * Remove team membership
 */
userSchema.methods.removeTeamMembership = async function(teamId) {
  const index = this.teamMemberships.findIndex(
    m => m.team.toString() === teamId.toString()
  );

  if (index === -1) {
    throw new Error('Not a member of this team');
  }

  const wasDefault = this.teamMemberships[index].isDefault;
  this.teamMemberships.splice(index, 1);

  // If removed was default, set first remaining as default
  if (wasDefault && this.teamMemberships.length > 0) {
    this.teamMemberships[0].isDefault = true;
  }

  await this.save();
  return this;
};

/**
 * Update last activity
 */
userSchema.methods.recordActivity = async function() {
  this.lastActiveAt = new Date();
  await this.save();
};

/**
 * Record login
 */
userSchema.methods.recordLogin = async function(ip, device) {
  this.lastLoginAt = new Date();
  this.lastActiveAt = new Date();
  this.loginCount += 1;
  this.lastLoginIp = ip;
  this.lastLoginDevice = device;
  await this.save();
};

/**
 * Complete onboarding step
 */
userSchema.methods.completeOnboardingStep = async function(step) {
  if (this.onboarding.steps[step] !== undefined) {
    this.onboarding.steps[step] = true;

    // Check if all steps are complete
    const allComplete = Object.values(this.onboarding.steps).every(v => v === true);
    if (allComplete) {
      this.onboarding.completed = true;
      this.onboarding.completedAt = new Date();
    }

    await this.save();
  }
  return this;
};

/**
 * Generate password reset token
 */
userSchema.methods.generatePasswordResetToken = async function() {
  const crypto = require('crypto');
  const token = crypto.randomBytes(32).toString('hex');

  this.passwordResetToken = crypto
    .createHash('sha256')
    .update(token)
    .digest('hex');

  this.passwordResetExpires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
  await this.save();

  return token;
};

/**
 * Suspend user
 */
userSchema.methods.suspend = async function(reason, suspendedBy) {
  this.status = 'suspended';
  this.suspendedAt = new Date();
  this.suspendedReason = reason;
  this.suspendedBy = suspendedBy;
  await this.save();
  return this;
};

/**
 * Reactivate user
 */
userSchema.methods.reactivate = async function() {
  this.status = 'active';
  this.suspendedAt = null;
  this.suspendedReason = null;
  this.suspendedBy = null;
  await this.save();
  return this;
};

// === STATIC METHODS ===

/**
 * Find user by email or username
 */
userSchema.statics.findByCredentials = async function(emailOrUsername) {
  return this.findOne({
    $or: [
      { email: emailOrUsername.toLowerCase() },
      { username: emailOrUsername.toLowerCase() }
    ]
  });
};

/**
 * Find users by role (including hybrid mapping)
 */
userSchema.statics.findByRole = async function(role) {
  const query = { role };

  // If looking for designers or marketeers, also include hybrid users
  if (['designer', 'marketeer'].includes(role)) {
    query.$or = [{ role }, { role: 'hybrid' }];
    delete query.role;
  }

  return this.find(query).select('-passwordHash');
};

/**
 * Find users in a workspace
 */
userSchema.statics.findInWorkspace = async function(workspaceId) {
  return this.find({
    $or: [
      { workspace: workspaceId },
      { 'teamMemberships.workspace': workspaceId }
    ],
    status: 'active'
  }).select('-passwordHash');
};

/**
 * Create a hybrid user with workspace
 */
userSchema.statics.createHybridUser = async function(userData) {
  const Workspace = mongoose.model('Workspace');

  const user = new this({
    ...userData,
    userType: 'hybrid',
    role: 'hybrid'
  });

  await user.save();

  // Create workspace for the user
  const workspace = await Workspace.createForHybridUser(user);
  user.workspace = workspace._id;
  await user.save();

  return user;
};

// === JSON TRANSFORM ===
userSchema.set('toJSON', {
  virtuals: true,
  transform: function(doc, ret) {
    delete ret.passwordHash;
    delete ret.passwordResetToken;
    delete ret.passwordResetExpires;
    delete ret.canvaAccessToken;
    delete ret.canvaRefreshToken;
    delete ret.invitationToken;
    delete ret.__v;

    // Clean up integrations tokens
    if (ret.integrations) {
      if (ret.integrations.canva) {
        delete ret.integrations.canva.accessToken;
        delete ret.integrations.canva.refreshToken;
      }
      if (ret.integrations.google) {
        delete ret.integrations.google.accessToken;
        delete ret.integrations.google.refreshToken;
      }
    }

    return ret;
  }
});

module.exports = mongoose.model('User', userSchema);
