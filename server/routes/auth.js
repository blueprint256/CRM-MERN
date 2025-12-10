const express = require('express');
const passport = require('passport');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const User = require('../models/User');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

// Validation rules
const signupValidation = [
  body('username').trim().isLength({ min: 3 }).withMessage('Username must be at least 3 characters'),
  body('firstName').trim().notEmpty().withMessage('First name is required'),
  body('lastName').trim().notEmpty().withMessage('Last name is required'),
  body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters')
];

const loginValidation = [
  body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
  body('password').notEmpty().withMessage('Password is required')
];

// Generate JWT token
const generateToken = (userId) => {
  return jwt.sign({ userId }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '24h'
  });
};

// POST /api/auth/signup - Register new user with local strategy
router.post('/signup', signupValidation, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { username, firstName, lastName, email, password } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({
      $or: [{ email: email.toLowerCase() }, { username }]
    });

    if (existingUser) {
      if (existingUser.email === email.toLowerCase()) {
        return res.status(400).json({ error: 'Email already registered' });
      }
      return res.status(400).json({ error: 'Username already taken' });
    }

    // Create new user with local auth
    const user = new User({
      username,
      firstName,
      lastName,
      email: email.toLowerCase(),
      passwordHash: password,
      role: 'client',
      authProvider: 'local'
    });

    await user.save();

    // Log in the user using Passport
    req.login(user, (err) => {
      if (err) {
        console.error('Login after signup error:', err);
        return res.status(500).json({ error: 'Error logging in after signup' });
      }

      const token = generateToken(user._id);

      res.status(201).json({
        message: 'User created successfully',
        token,
        user
      });
    });
  } catch (error) {
    console.error('Signup error:', error);
    res.status(500).json({ error: 'Error creating user' });
  }
});

// POST /api/auth/login - Login with local strategy (Passport)
router.post('/login', loginValidation, (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  passport.authenticate('local', (err, user, info) => {
    if (err) {
      console.error('Login error:', err);
      return res.status(500).json({ error: 'Error logging in' });
    }

    if (!user) {
      // Check if password change is required
      if (info && info.requirePasswordChange) {
        return res.status(403).json({
          error: 'Password change required',
          requirePasswordChange: true
        });
      }
      return res.status(401).json({ error: info?.message || 'Invalid email or password' });
    }

    req.login(user, (loginErr) => {
      if (loginErr) {
        console.error('Session login error:', loginErr);
        return res.status(500).json({ error: 'Error creating session' });
      }

      const token = generateToken(user._id);

      res.json({
        message: 'Login successful',
        token,
        user
      });
    });
  })(req, res, next);
});

// POST /api/auth/change-password - For new users with temp password
router.post('/change-password', [
  body('email').isEmail().normalizeEmail(),
  body('currentPassword').notEmpty(),
  body('newPassword').isLength({ min: 6 })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, currentPassword, newPassword } = req.body;

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    // Check if user uses OAuth and has no password
    if (!user.canUsePasswordLogin()) {
      return res.status(400).json({ error: 'This account uses social login. Please login with Google.' });
    }

    const isMatch = await user.checkPassword(currentPassword);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid current password' });
    }

    await user.setPassword(newPassword);
    user.createPassword = false;
    await user.save();

    // Log in the user
    req.login(user, (err) => {
      if (err) {
        console.error('Login after password change error:', err);
      }

      const token = generateToken(user._id);

      res.json({
        message: 'Password updated successfully',
        token,
        user
      });
    });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({ error: 'Error changing password' });
  }
});

// GET /api/auth/google - Initiate Google OAuth2
router.get('/google', passport.authenticate('google', {
  scope: ['profile', 'email']
}));

// GET /api/auth/google/callback - Google OAuth2 callback
router.get('/google/callback',
  passport.authenticate('google', {
    failureRedirect: `${process.env.CLIENT_URL || 'http://localhost:3000'}/login?error=oauth_failed`
  }),
  (req, res) => {
    // Generate JWT token for the authenticated user
    const token = generateToken(req.user._id);

    // Redirect to frontend with token
    const redirectUrl = `${process.env.CLIENT_URL || 'http://localhost:3000'}/oauth/callback?token=${token}`;
    res.redirect(redirectUrl);
  }
);

// GET /api/auth/me - Get current user
router.get('/me', authenticate, async (req, res) => {
  res.json({ user: req.user });
});

// POST /api/auth/logout
router.post('/logout', (req, res) => {
  req.logout((err) => {
    if (err) {
      console.error('Logout error:', err);
      return res.status(500).json({ error: 'Error logging out' });
    }

    req.session.destroy((sessionErr) => {
      if (sessionErr) {
        console.error('Session destroy error:', sessionErr);
      }
      res.json({ message: 'Logged out successfully' });
    });
  });
});

// GET /api/auth/session - Check if user has an active session
router.get('/session', (req, res) => {
  if (req.isAuthenticated()) {
    res.json({ authenticated: true, user: req.user });
  } else {
    res.json({ authenticated: false });
  }
});

module.exports = router;
