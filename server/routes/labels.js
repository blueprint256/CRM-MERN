const express = require('express');
const { body, validationResult } = require('express-validator');
const Label = require('../models/Label');
const { authenticate, authorize } = require('../middleware/auth');
const logger = require('../utils/logger');

const router = express.Router();

// GET /api/labels - Get all labels (global + user's custom)
router.get('/', authenticate, async (req, res) => {
  try {
    const labels = await Label.find({
      $or: [
        { isGlobal: true },
        { createdBy: req.user._id }
      ]
    })
      .populate('createdBy', 'firstName lastName')
      .sort({ type: 1, name: 1 });

    res.json({ labels });
  } catch (error) {
    logger.logError(error, { context: 'labels.getAll', userId: req.user._id });
    res.status(500).json({ error: 'Error fetching labels' });
  }
});

// GET /api/labels/:id - Get single label
router.get('/:id', authenticate, async (req, res) => {
  try {
    const label = await Label.findById(req.params.id)
      .populate('createdBy', 'firstName lastName');

    if (!label) {
      return res.status(404).json({ error: 'Label not found' });
    }

    res.json({ label });
  } catch (error) {
    logger.logError(error, { context: 'labels.getOne', labelId: req.params.id });
    res.status(500).json({ error: 'Error fetching label' });
  }
});

// POST /api/labels - Create new label
router.post('/', authenticate, [
  body('name').trim().notEmpty().withMessage('Label name is required').isLength({ max: 50 }),
  body('color').optional().matches(/^#[0-9A-Fa-f]{6}$/).withMessage('Invalid color format'),
  body('description').optional().isLength({ max: 200 }),
  body('appliesTo').optional().isArray(),
  body('isGlobal').optional().isBoolean()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { name, color, description, appliesTo, isGlobal } = req.body;

    // Check for duplicate
    const existing = await Label.findOne({
      name: name.toLowerCase(),
      $or: [
        { isGlobal: true },
        { createdBy: req.user._id }
      ]
    });

    if (existing) {
      return res.status(400).json({ error: 'Label with this name already exists' });
    }

    // Only system users can create global labels
    const labelIsGlobal = req.user.role === 'system' ? (isGlobal ?? true) : false;

    const label = new Label({
      name: name.toLowerCase(),
      color: color || '#6c757d',
      description,
      appliesTo: appliesTo || ['content', 'asset', 'campaign'],
      isGlobal: labelIsGlobal,
      type: 'custom',
      createdBy: req.user._id
    });

    await label.save();
    await label.populate('createdBy', 'firstName lastName');

    logger.info('Label created', { labelId: label._id, userId: req.user._id });
    res.status(201).json({ label });
  } catch (error) {
    logger.logError(error, { context: 'labels.create', userId: req.user._id });
    res.status(500).json({ error: 'Error creating label' });
  }
});

// PUT /api/labels/:id - Update label
router.put('/:id', authenticate, [
  body('name').optional().trim().isLength({ min: 1, max: 50 }),
  body('color').optional().matches(/^#[0-9A-Fa-f]{6}$/),
  body('description').optional().isLength({ max: 200 })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const label = await Label.findById(req.params.id);

    if (!label) {
      return res.status(404).json({ error: 'Label not found' });
    }

    // Only creator or system can edit
    if (label.createdBy.toString() !== req.user._id.toString() && req.user.role !== 'system') {
      return res.status(403).json({ error: 'Not authorized to edit this label' });
    }

    // Cannot edit system labels
    if (label.type === 'system' && req.user.role !== 'system') {
      return res.status(403).json({ error: 'Cannot edit system labels' });
    }

    const { name, color, description, appliesTo } = req.body;

    if (name) label.name = name.toLowerCase();
    if (color) label.color = color;
    if (description !== undefined) label.description = description;
    if (appliesTo) label.appliesTo = appliesTo;

    await label.save();
    await label.populate('createdBy', 'firstName lastName');

    logger.info('Label updated', { labelId: label._id, userId: req.user._id });
    res.json({ label });
  } catch (error) {
    logger.logError(error, { context: 'labels.update', labelId: req.params.id });
    res.status(500).json({ error: 'Error updating label' });
  }
});

// DELETE /api/labels/:id - Delete label
router.delete('/:id', authenticate, async (req, res) => {
  try {
    const label = await Label.findById(req.params.id);

    if (!label) {
      return res.status(404).json({ error: 'Label not found' });
    }

    // Only creator or system can delete
    if (label.createdBy.toString() !== req.user._id.toString() && req.user.role !== 'system') {
      return res.status(403).json({ error: 'Not authorized to delete this label' });
    }

    // Cannot delete system labels
    if (label.type === 'system') {
      return res.status(403).json({ error: 'Cannot delete system labels' });
    }

    await Label.findByIdAndDelete(req.params.id);

    logger.info('Label deleted', { labelId: req.params.id, userId: req.user._id });
    res.json({ message: 'Label deleted successfully' });
  } catch (error) {
    logger.logError(error, { context: 'labels.delete', labelId: req.params.id });
    res.status(500).json({ error: 'Error deleting label' });
  }
});

// POST /api/labels/seed-system - Seed system labels (admin only)
router.post('/seed-system', authenticate, authorize('system'), async (req, res) => {
  try {
    const systemLabels = Label.getSystemLabels();
    const created = [];

    for (const labelData of systemLabels) {
      const existing = await Label.findOne({ name: labelData.name, type: 'system' });
      if (!existing) {
        const label = new Label({
          ...labelData,
          isGlobal: true,
          appliesTo: ['content', 'asset', 'campaign'],
          createdBy: req.user._id
        });
        await label.save();
        created.push(label);
      }
    }

    logger.info('System labels seeded', { count: created.length, userId: req.user._id });
    res.json({ message: `${created.length} system labels created`, labels: created });
  } catch (error) {
    logger.logError(error, { context: 'labels.seedSystem' });
    res.status(500).json({ error: 'Error seeding system labels' });
  }
});

module.exports = router;
