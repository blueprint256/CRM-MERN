const express = require('express');
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

// POST /api/auth/signup - Register new user (client role by default)
router.post('/signup', signupValidation, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { username, firstName, lastName, email, password } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({
      $or: [{ email }, { username }]
    });

    if (existingUser) {
      if (existingUser.email === email) {
        return res.status(400).json({ error: 'Email already registered' });
      }
      return res.status(400).json({ error: 'Username already taken' });
    }

    // Create new user
    const user = new User({
      username,
      firstName,
      lastName,
      email,
      passwordHash: password,
      role: 'client'
    });

    await user.save();

    const token = generateToken(user._id);

    res.status(201).json({
      message: 'User created successfully',
      token,
      user
    });
  } catch (error) {
    console.error('Signup error:', error);
    res.status(500).json({ error: 'Error creating user' });
  }
});

// POST /api/auth/login
router.post('/login', loginValidation, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    // Check if user needs to change password
    if (user.createPassword) {
      return res.status(403).json({
        error: 'Password change required',
        requirePasswordChange: true
      });
    }

    const isMatch = await user.checkPassword(password);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const token = generateToken(user._id);

    res.json({
      message: 'Login successful',
      token,
      user
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Error logging in' });
  }
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

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const isMatch = await user.checkPassword(currentPassword);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid current password' });
    }

    await user.setPassword(newPassword);
    user.createPassword = false;
    await user.save();

    const token = generateToken(user._id);

    res.json({
      message: 'Password updated successfully',
      token,
      user
    });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({ error: 'Error changing password' });
  }
});

// GET /api/auth/me - Get current user
router.get('/me', authenticate, async (req, res) => {
  res.json({ user: req.user });
});

// POST /api/auth/logout
router.post('/logout', authenticate, (req, res) => {
  res.json({ message: 'Logged out successfully' });
});

module.exports = router;
