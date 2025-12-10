const express = require('express');
const { body, validationResult } = require('express-validator');
const User = require('../models/User');
const { authenticate, isSystemAdmin } = require('../middleware/auth');
const { generateTempPassword, sendEmail, welcomeEmailBody } = require('../utils/helpers');
const logger = require('../utils/logger');

const router = express.Router();

// GET /api/users - Get all users (system admin only)
router.get('/', authenticate, isSystemAdmin, async (req, res) => {
  try {
    const users = await User.find().sort({ createdAt: -1 });
    res.json({ users });
  } catch (error) {
    logger.logError(error, { context: 'users.getAll', userId: req.user._id });
    res.status(500).json({ error: 'Error fetching users' });
  }
});

// GET /api/users/by-role/:role - Get users by role
router.get('/by-role/:role', authenticate, async (req, res) => {
  try {
    const { role } = req.params;
    let query = {};

    if (role === 'designer') {
      query = { role: { $in: ['designer', 'hybrid'] } };
    } else if (role === 'marketeer') {
      query = { role: { $in: ['marketeer', 'hybrid'] } };
    } else {
      query = { role };
    }

    const users = await User.find(query).select('firstName lastName email role');
    res.json({ users });
  } catch (error) {
    logger.logError(error, { context: 'users.getByRole', role: req.params.role, userId: req.user._id });
    res.status(500).json({ error: 'Error fetching users' });
  }
});

// GET /api/users/:id - Get single user
router.get('/:id', authenticate, async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json({ user });
  } catch (error) {
    logger.logError(error, { context: 'users.getOne', targetUserId: req.params.id, userId: req.user._id });
    res.status(500).json({ error: 'Error fetching user' });
  }
});

// POST /api/users - Create new user (system admin only)
router.post('/', authenticate, isSystemAdmin, [
  body('username').trim().isLength({ min: 3 }),
  body('firstName').trim().notEmpty(),
  body('lastName').trim().notEmpty(),
  body('email').isEmail().normalizeEmail(),
  body('role').isIn(['system', 'designer', 'marketeer', 'client', 'hybrid'])
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { username, firstName, lastName, email, role } = req.body;

    // Check if user exists
    const existingUser = await User.findOne({
      $or: [{ email }, { username }]
    });

    if (existingUser) {
      return res.status(400).json({ error: 'User with this email or username already exists' });
    }

    // Generate temp password
    const tempPassword = generateTempPassword(10);

    const user = new User({
      username,
      firstName,
      lastName,
      email,
      role,
      passwordHash: tempPassword,
      createPassword: true
    });

    await user.save();

    // Send welcome email with temp password
    try {
      await sendEmail(
        email,
        'Welcome to Blueprint Marketing',
        welcomeEmailBody(firstName, tempPassword)
      );
    } catch (emailError) {
      logger.logError(emailError, { context: 'users.create.sendEmail', email, userId: req.user._id });
      // Continue even if email fails
    }

    res.status(201).json({
      message: 'User created successfully',
      user
    });
  } catch (error) {
    logger.logError(error, { context: 'users.create', email: req.body.email, userId: req.user._id });
    res.status(500).json({ error: 'Error creating user' });
  }
});

// PUT /api/users/:id - Update user
router.put('/:id', authenticate, isSystemAdmin, [
  body('firstName').optional().trim().notEmpty(),
  body('lastName').optional().trim().notEmpty(),
  body('email').optional().isEmail().normalizeEmail(),
  body('role').optional().isIn(['system', 'designer', 'marketeer', 'client', 'hybrid'])
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const updates = {};
    const allowedFields = ['firstName', 'lastName', 'email', 'role'];

    allowedFields.forEach(field => {
      if (req.body[field] !== undefined) {
        updates[field] = req.body[field];
      }
    });

    const user = await User.findByIdAndUpdate(
      req.params.id,
      updates,
      { new: true, runValidators: true }
    );

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ message: 'User updated successfully', user });
  } catch (error) {
    logger.logError(error, { context: 'users.update', targetUserId: req.params.id, userId: req.user._id });
    res.status(500).json({ error: 'Error updating user' });
  }
});

// DELETE /api/users/:id - Delete user (system admin only)
router.delete('/:id', authenticate, isSystemAdmin, async (req, res) => {
  try {
    const user = await User.findByIdAndDelete(req.params.id);

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    logger.logError(error, { context: 'users.delete', targetUserId: req.params.id, userId: req.user._id });
    res.status(500).json({ error: 'Error deleting user' });
  }
});

module.exports = router;
