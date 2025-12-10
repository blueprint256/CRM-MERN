const express = require('express');
const passport = require('passport');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const User = require('../models/User');
const { authenticate } = require('../middleware/auth');
const logger = require('../utils/logger');

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
  try {
    return jwt.sign({ userId }, process.env.JWT_SECRET, {
      expiresIn: process.env.JWT_EXPIRES_IN || '24h'
    });
  } catch (error) {
    logger.logError(error, { context: 'generateToken', userId });
    throw error;
  }
};

// POST /api/auth/signup - Register new user with local strategy
router.post('/signup', signupValidation, async (req, res) => {
  const { email, username } = req.body;

  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      logger.warn('Signup validation failed', { errors: errors.array(), email });
      return res.status(400).json({ errors: errors.array() });
    }

    const { firstName, lastName, password } = req.body;

    logger.info('Signup attempt', { email, username });

    // Check if user already exists
    const existingUser = await User.findOne({
      $or: [{ email: email.toLowerCase() }, { username }]
    });

    if (existingUser) {
      if (existingUser.email === email.toLowerCase()) {
        logger.logAuth('signup_attempt', null, false, { email, reason: 'email_exists' });
        return res.status(400).json({ error: 'Email already registered' });
      }
      logger.logAuth('signup_attempt', null, false, { username, reason: 'username_exists' });
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
    logger.logAuth('signup', user._id, true, { email });

    // Log in the user using Passport
    req.login(user, (err) => {
      if (err) {
        logger.logError(err, { context: 'signup.login', userId: user._id });
        return res.status(500).json({ error: 'Error logging in after signup' });
      }

      try {
        const token = generateToken(user._id);
        logger.info('User signup and login successful', { userId: user._id });

        res.status(201).json({
          message: 'User created successfully',
          token,
          user
        });
      } catch (tokenError) {
        logger.logError(tokenError, { context: 'signup.generateToken', userId: user._id });
        res.status(500).json({ error: 'Error generating authentication token' });
      }
    });
  } catch (error) {
    logger.logError(error, { context: 'signup', email });

    // Handle MongoDB duplicate key errors
    if (error.code === 11000) {
      const field = Object.keys(error.keyPattern)[0];
      return res.status(400).json({ error: `${field} already exists` });
    }

    res.status(500).json({ error: 'Error creating user' });
  }
});

// POST /api/auth/login - Login with local strategy (Passport)
router.post('/login', loginValidation, (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    logger.warn('Login validation failed', { errors: errors.array() });
    return res.status(400).json({ errors: errors.array() });
  }

  const { email } = req.body;
  logger.info('Login attempt', { email });

  passport.authenticate('local', (err, user, info) => {
    if (err) {
      logger.logError(err, { context: 'login.authenticate', email });
      return res.status(500).json({ error: 'Error logging in' });
    }

    if (!user) {
      // Check if password change is required
      if (info && info.requirePasswordChange) {
        logger.info('Password change required for user', { email });
        return res.status(403).json({
          error: 'Password change required',
          requirePasswordChange: true
        });
      }
      // Logging is already done in passport strategy
      return res.status(401).json({ error: info?.message || 'Invalid email or password' });
    }

    req.login(user, (loginErr) => {
      if (loginErr) {
        logger.logError(loginErr, { context: 'login.session', userId: user._id });
        return res.status(500).json({ error: 'Error creating session' });
      }

      try {
        const token = generateToken(user._id);
        logger.info('Login successful', { userId: user._id });

        res.json({
          message: 'Login successful',
          token,
          user
        });
      } catch (tokenError) {
        logger.logError(tokenError, { context: 'login.generateToken', userId: user._id });
        res.status(500).json({ error: 'Error generating authentication token' });
      }
    });
  })(req, res, next);
});

// POST /api/auth/change-password - For new users with temp password
router.post('/change-password', [
  body('email').isEmail().normalizeEmail(),
  body('currentPassword').notEmpty(),
  body('newPassword').isLength({ min: 6 })
], async (req, res) => {
  const { email } = req.body;

  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      logger.warn('Change password validation failed', { errors: errors.array(), email });
      return res.status(400).json({ errors: errors.array() });
    }

    const { currentPassword, newPassword } = req.body;
    logger.info('Password change attempt', { email });

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      logger.logAuth('password_change', null, false, { email, reason: 'user_not_found' });
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    // Check if user uses OAuth and has no password
    if (!user.canUsePasswordLogin()) {
      logger.logAuth('password_change', user._id, false, { reason: 'oauth_only_account' });
      return res.status(400).json({ error: 'This account uses social login. Please login with Google.' });
    }

    const isMatch = await user.checkPassword(currentPassword);
    if (!isMatch) {
      logger.logAuth('password_change', user._id, false, { reason: 'invalid_current_password' });
      return res.status(401).json({ error: 'Invalid current password' });
    }

    await user.setPassword(newPassword);
    user.createPassword = false;
    await user.save();

    logger.logAuth('password_change', user._id, true);

    // Log in the user
    req.login(user, (err) => {
      if (err) {
        logger.logError(err, { context: 'change_password.login', userId: user._id });
        // Still return success since password was changed
      }

      try {
        const token = generateToken(user._id);
        logger.info('Password changed successfully', { userId: user._id });

        res.json({
          message: 'Password updated successfully',
          token,
          user
        });
      } catch (tokenError) {
        logger.logError(tokenError, { context: 'change_password.generateToken', userId: user._id });
        res.status(500).json({ error: 'Password changed but error generating token' });
      }
    });
  } catch (error) {
    logger.logError(error, { context: 'change_password', email });
    res.status(500).json({ error: 'Error changing password' });
  }
});

// GET /api/auth/google - Initiate Google OAuth2
router.get('/google', (req, res, next) => {
  logger.info('Google OAuth initiation');

  passport.authenticate('google', {
    scope: ['profile', 'email']
  })(req, res, next);
});

// GET /api/auth/google/callback - Google OAuth2 callback
router.get('/google/callback', (req, res, next) => {
  passport.authenticate('google', (err, user, info) => {
    const clientUrl = process.env.CLIENT_URL || 'http://localhost:3000';

    if (err) {
      logger.logError(err, { context: 'google_callback' });
      return res.redirect(`${clientUrl}/login?error=oauth_error`);
    }

    if (!user) {
      const errorMessage = info?.message || 'oauth_failed';
      logger.warn('Google OAuth failed', { reason: errorMessage });
      return res.redirect(`${clientUrl}/login?error=${encodeURIComponent(errorMessage)}`);
    }

    req.login(user, (loginErr) => {
      if (loginErr) {
        logger.logError(loginErr, { context: 'google_callback.login', userId: user._id });
        return res.redirect(`${clientUrl}/login?error=session_error`);
      }

      try {
        const token = generateToken(user._id);
        logger.logAuth('oauth_callback', user._id, true, { provider: 'google' });

        const redirectUrl = `${clientUrl}/oauth/callback?token=${token}`;
        res.redirect(redirectUrl);
      } catch (tokenError) {
        logger.logError(tokenError, { context: 'google_callback.generateToken', userId: user._id });
        res.redirect(`${clientUrl}/login?error=token_error`);
      }
    });
  })(req, res, next);
});

// GET /api/auth/me - Get current user
router.get('/me', authenticate, async (req, res) => {
  try {
    logger.debug('Get current user', { userId: req.user._id });
    res.json({ user: req.user });
  } catch (error) {
    logger.logError(error, { context: 'get_me' });
    res.status(500).json({ error: 'Error fetching user' });
  }
});

// POST /api/auth/logout
router.post('/logout', (req, res) => {
  const userId = req.user?._id;
  logger.info('Logout attempt', { userId });

  req.logout((err) => {
    if (err) {
      logger.logError(err, { context: 'logout', userId });
      return res.status(500).json({ error: 'Error logging out' });
    }

    if (req.session) {
      req.session.destroy((sessionErr) => {
        if (sessionErr) {
          logger.logError(sessionErr, { context: 'logout.session_destroy', userId });
          // Still return success since logout was done
        }
        logger.logAuth('logout', userId, true);
        res.json({ message: 'Logged out successfully' });
      });
    } else {
      logger.logAuth('logout', userId, true);
      res.json({ message: 'Logged out successfully' });
    }
  });
});

// GET /api/auth/session - Check if user has an active session
router.get('/session', (req, res) => {
  try {
    if (req.isAuthenticated()) {
      logger.debug('Session check: authenticated', { userId: req.user._id });
      res.json({ authenticated: true, user: req.user });
    } else {
      logger.debug('Session check: not authenticated');
      res.json({ authenticated: false });
    }
  } catch (error) {
    logger.logError(error, { context: 'session_check' });
    res.status(500).json({ error: 'Error checking session' });
  }
});

// Error handling middleware for auth routes
router.use((err, req, res, next) => {
  logger.logError(err, {
    context: 'auth_route_error',
    url: req.originalUrl,
    method: req.method
  });

  res.status(err.status || 500).json({
    error: err.message || 'Authentication error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

module.exports = router;
