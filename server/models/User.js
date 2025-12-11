const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true,
    trim: true,
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
  role: {
    type: String,
    enum: ['system', 'designer', 'marketeer', 'client', 'hybrid'],
    default: 'client',
    index: true
  },
  passwordHash: {
    type: String,
    required: true
  },
  createPassword: {
    type: Boolean,
    default: false
  },
  // OAuth fields
  googleId: {
    type: String,
    unique: true,
    sparse: true,
    index: true
  },
  authProvider: {
    type: String,
    enum: ['local', 'google'],
    default: 'local'
  },
  profilePicture: {
    type: String,
    default: null
  },
  // Canva integration fields
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
  }
}, {
  timestamps: true
});

// Hash password before saving (skip for OAuth users)
userSchema.pre('save', async function(next) {
  if (!this.isModified('passwordHash')) return next();

  // Skip hashing for OAuth placeholder passwords
  if (this.passwordHash === 'oauth_no_password') {
    return next();
  }

  try {
    const salt = await bcrypt.genSalt(10);
    this.passwordHash = await bcrypt.hash(this.passwordHash, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Method to check password
userSchema.methods.checkPassword = async function(password) {
  // OAuth users can't use password login directly
  if (this.authProvider !== 'local' && this.passwordHash === 'oauth_no_password') {
    return false;
  }
  return bcrypt.compare(password, this.passwordHash);
};

// Method to set password (for updates)
userSchema.methods.setPassword = async function(password) {
  const salt = await bcrypt.genSalt(10);
  this.passwordHash = await bcrypt.hash(password, salt);
  this.authProvider = 'local'; // When setting password, switch to local auth
};

// Check if user can use password login
userSchema.methods.canUsePasswordLogin = function() {
  return this.authProvider === 'local' || this.passwordHash !== 'oauth_no_password';
};

// Virtual for full name
userSchema.virtual('fullName').get(function() {
  return `${this.firstName} ${this.lastName}`;
});

// Ensure virtuals are included in JSON
userSchema.set('toJSON', {
  virtuals: true,
  transform: function(doc, ret) {
    delete ret.passwordHash;
    delete ret.canvaAccessToken;
    delete ret.canvaRefreshToken;
    delete ret.__v;
    return ret;
  }
});

module.exports = mongoose.model('User', userSchema);
