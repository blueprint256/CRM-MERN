const express = require('express');
const { body, validationResult } = require('express-validator');
const Prompt = require('../models/Prompt');
const { authenticate, isSystemAdmin } = require('../middleware/auth');

const router = express.Router();

// GET /api/prompts - Get current prompt
router.get('/', authenticate, async (req, res) => {
  try {
    const prompt = await Prompt.findOne();
    res.json({ prompt: prompt?.prompt || '' });
  } catch (error) {
    console.error('Get prompt error:', error);
    res.status(500).json({ error: 'Error fetching prompt' });
  }
});

// PUT /api/prompts - Update or create prompt (system admin only)
router.put('/', authenticate, isSystemAdmin, [
  body('prompt').trim().notEmpty().withMessage('Prompt is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { prompt } = req.body;

    let promptDoc = await Prompt.findOne();

    if (promptDoc) {
      promptDoc.prompt = prompt;
      await promptDoc.save();
    } else {
      promptDoc = await Prompt.create({ prompt });
    }

    res.json({
      message: 'Prompt updated successfully',
      prompt: promptDoc.prompt
    });
  } catch (error) {
    console.error('Update prompt error:', error);
    res.status(500).json({ error: 'Error updating prompt' });
  }
});

module.exports = router;
