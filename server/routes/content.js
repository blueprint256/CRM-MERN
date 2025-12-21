const express = require('express');
const { body, validationResult } = require('express-validator');
const Content = require('../models/Content');
const Campaign = require('../models/Campaign');
const Asset = require('../models/Asset');
const { authenticate } = require('../middleware/auth');
const logger = require('../utils/logger');

const router = express.Router();

// GET /api/content - Get all content with filtering
router.get('/', authenticate, async (req, res) => {
  try {
    const {
      page = 1,
      limit = 50,
      stage,
      campaign,
      platform,
      search,
      assignedTo,
      isRecurring,
      sortBy = 'updatedAt',
      sortOrder = 'desc'
    } = req.query;

    const query = {
      deletedAt: null,
      $or: [
        { createdBy: req.user._id },
        { assignedTo: req.user._id },
        { reviewers: req.user._id }
      ]
    };

    // Filters
    if (stage) {
      query.stage = Array.isArray(stage) ? { $in: stage } : stage;
    }
    if (campaign) query.campaign = campaign;
    if (platform) query.platforms = platform;
    if (assignedTo) query.assignedTo = assignedTo;
    if (isRecurring !== undefined) query.isRecurring = isRecurring === 'true';
    if (search) {
      query.$text = { $search: search };
    }

    const sort = {};
    sort[sortBy] = sortOrder === 'asc' ? 1 : -1;

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [content, total] = await Promise.all([
      Content.find(query)
        .populate('createdBy', 'firstName lastName email')
        .populate('assignedTo', 'firstName lastName email')
        .populate('campaign', 'name color')
        .populate('primaryAsset', 'thumbnailUrl s3Url type')
        .populate('labels', 'name color')
        .sort(sort)
        .skip(skip)
        .limit(parseInt(limit)),
      Content.countDocuments(query)
    ]);

    res.json({
      content,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    logger.logError(error, { context: 'content.getAll', userId: req.user._id });
    res.status(500).json({ error: 'Error fetching content' });
  }
});

// GET /api/content/board - Get content grouped by stage (Kanban view)
router.get('/board', authenticate, async (req, res) => {
  try {
    // Accept both 'campaign' (from frontend) and 'campaignId' for compatibility
    const { campaign, campaignId, platform, platforms } = req.query;

    const options = {
      campaignId: campaign || campaignId
    };

    // Handle platform filter (frontend sends 'platform', also support 'platforms')
    const platformFilter = platform || platforms;
    if (platformFilter) {
      // Note: This was incorrectly being used as stages filter
      // Keep for backward compatibility but the model doesn't filter by platform in getByStage
      options.platforms = platformFilter.split ? platformFilter.split(',') : [platformFilter];
    }

    const grouped = await Content.getByStage(req.user._id, options);

    // Return directly (not wrapped) to match frontend expectations
    res.json(grouped);
  } catch (error) {
    logger.logError(error, { context: 'content.board', userId: req.user._id });
    res.status(500).json({ error: 'Error fetching content board' });
  }
});

// GET /api/content/calendar - Get content for calendar view
router.get('/calendar', authenticate, async (req, res) => {
  try {
    const { startDate, endDate, campaignId, platforms } = req.query;

    if (!startDate || !endDate) {
      return res.status(400).json({ error: 'startDate and endDate are required' });
    }

    const options = {};
    if (campaignId) options.campaignId = campaignId;
    if (platforms) options.platforms = platforms.split(',');

    const content = await Content.getForCalendar(
      req.user._id,
      new Date(startDate),
      new Date(endDate),
      options
    );

    res.json({ content });
  } catch (error) {
    logger.logError(error, { context: 'content.calendar', userId: req.user._id });
    res.status(500).json({ error: 'Error fetching calendar content' });
  }
});

// GET /api/content/recurring - Get recurring content
router.get('/recurring', authenticate, async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;

    const query = {
      isRecurring: true,
      parentContent: null, // Only parent recurring items
      deletedAt: null,
      $or: [
        { createdBy: req.user._id },
        { assignedTo: req.user._id }
      ]
    };

    const [content, total] = await Promise.all([
      Content.find(query)
        .populate('createdBy', 'firstName lastName')
        .populate('campaign', 'name color')
        .populate('primaryAsset', 'thumbnailUrl')
        .sort({ updatedAt: -1 })
        .skip((parseInt(page) - 1) * parseInt(limit))
        .limit(parseInt(limit)),
      Content.countDocuments(query)
    ]);

    res.json({
      content,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    logger.logError(error, { context: 'content.recurring', userId: req.user._id });
    res.status(500).json({ error: 'Error fetching recurring content' });
  }
});

// GET /api/content/:id - Get single content item
router.get('/:id', authenticate, async (req, res) => {
  try {
    const content = await Content.findById(req.params.id)
      .populate('createdBy', 'firstName lastName email')
      .populate('assignedTo', 'firstName lastName email')
      .populate('reviewers', 'firstName lastName email')
      .populate('approvedBy', 'firstName lastName email')
      .populate('campaign', 'name color status')
      .populate('assets', 'filename s3Url thumbnailUrl type size')
      .populate('primaryAsset', 's3Url thumbnailUrl type')
      .populate('labels', 'name color')
      .populate('comments.user', 'firstName lastName email')
      .populate('parentContent', 'title scheduledFor')
      .populate('pendingApprovals.user', 'firstName lastName email');

    if (!content) {
      return res.status(404).json({ error: 'Content not found' });
    }

    res.json({ content });
  } catch (error) {
    logger.logError(error, { context: 'content.getOne', contentId: req.params.id });
    res.status(500).json({ error: 'Error fetching content' });
  }
});

// POST /api/content - Create new content
router.post('/', authenticate, [
  body('title').trim().notEmpty().withMessage('Title is required').isLength({ max: 200 }),
  body('type').optional().isIn(['post', 'story', 'reel', 'thread', 'article', 'video', 'ad', 'campaign_post']),
  body('body').optional().isLength({ max: 10000 }),
  body('platforms').optional().isArray()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const {
      title, type, body, platforms, campaign, variants,
      assets, primaryAsset, labels, tags, hashtags,
      assignedTo, scheduledFor, timezone,
      isRecurring, recurrence, priority, internalNotes
    } = req.body;

    // Validate campaign access if provided
    if (campaign) {
      const campaignDoc = await Campaign.findById(campaign);
      if (!campaignDoc) {
        return res.status(404).json({ error: 'Campaign not found' });
      }
      if (!campaignDoc.hasAccess(req.user._id, 'contributor')) {
        return res.status(403).json({ error: 'Not authorized to add content to this campaign' });
      }
    }

    const content = new Content({
      title,
      type: type || 'post',
      body: body || '',
      platforms: platforms || [],
      campaign,
      variants: variants || {},
      assets: assets || [],
      primaryAsset,
      labels: labels || [],
      tags: tags || [],
      hashtags: hashtags || [],
      assignedTo,
      scheduledFor,
      timezone: timezone || 'UTC',
      isRecurring: isRecurring || false,
      recurrence: recurrence || {},
      priority: priority || 'normal',
      internalNotes: internalNotes || '',
      stage: 'idea',
      createdBy: req.user._id
    });

    await content.save();

    // Update asset usage
    if (assets && assets.length > 0) {
      await Asset.updateMany(
        { _id: { $in: assets } },
        {
          $addToSet: { usedIn: content._id },
          $inc: { usageCount: 1 }
        }
      );
    }

    // Update campaign content counts
    if (campaign) {
      const campaignDoc = await Campaign.findById(campaign);
      await campaignDoc.updateContentCounts();
    }

    await content.populate([
      { path: 'createdBy', select: 'firstName lastName email' },
      { path: 'campaign', select: 'name color' },
      { path: 'primaryAsset', select: 'thumbnailUrl s3Url' },
      { path: 'labels', select: 'name color' }
    ]);

    logger.info('Content created', { contentId: content._id, userId: req.user._id });
    res.status(201).json({ content });
  } catch (error) {
    logger.logError(error, { context: 'content.create', userId: req.user._id });
    res.status(500).json({ error: 'Error creating content' });
  }
});

// PUT /api/content/:id - Update content
router.put('/:id', authenticate, [
  body('title').optional().trim().isLength({ min: 1, max: 200 }),
  body('body').optional().isLength({ max: 10000 })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const content = await Content.findById(req.params.id);

    if (!content) {
      return res.status(404).json({ error: 'Content not found' });
    }

    // Check permission
    const canEdit = content.createdBy.toString() === req.user._id.toString() ||
      content.assignedTo?.toString() === req.user._id.toString() ||
      req.user.role === 'system';

    if (!canEdit) {
      return res.status(403).json({ error: 'Not authorized to edit this content' });
    }

    // Save version before updating
    if (req.body.saveVersion) {
      await content.saveVersion(req.user._id, req.body.versionNote || '');
    }

    const allowedFields = [
      'title', 'type', 'body', 'platforms', 'variants',
      'assets', 'primaryAsset', 'labels', 'tags', 'hashtags',
      'links', 'assignedTo', 'scheduledFor', 'timezone',
      'isRecurring', 'recurrence', 'priority', 'isFeatured', 'internalNotes'
    ];

    allowedFields.forEach(field => {
      if (req.body[field] !== undefined) {
        content[field] = req.body[field];
      }
    });

    await content.save();
    await content.populate([
      { path: 'createdBy', select: 'firstName lastName email' },
      { path: 'assignedTo', select: 'firstName lastName email' },
      { path: 'campaign', select: 'name color' },
      { path: 'primaryAsset', select: 'thumbnailUrl s3Url' },
      { path: 'labels', select: 'name color' }
    ]);

    logger.info('Content updated', { contentId: content._id, userId: req.user._id });
    res.json({ content });
  } catch (error) {
    logger.logError(error, { context: 'content.update', contentId: req.params.id });
    res.status(500).json({ error: 'Error updating content' });
  }
});

// POST /api/content/:id/stage - Move content to new stage
router.post('/:id/stage', authenticate, [
  body('stage').notEmpty().isIn(['idea', 'draft', 'review', 'revision', 'approved', 'scheduled', 'publishing', 'published', 'failed', 'archived'])
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const content = await Content.findById(req.params.id);

    if (!content) {
      return res.status(404).json({ error: 'Content not found' });
    }

    const { stage } = req.body;

    await content.moveToStage(stage, req.user._id);

    // Update campaign counts if applicable
    if (content.campaign) {
      const campaign = await Campaign.findById(content.campaign);
      if (campaign) await campaign.updateContentCounts();
    }

    await content.populate([
      { path: 'createdBy', select: 'firstName lastName email' },
      { path: 'assignedTo', select: 'firstName lastName email' }
    ]);

    logger.info('Content stage changed', { contentId: content._id, stage, userId: req.user._id });
    res.json({ content });
  } catch (error) {
    if (error.message.includes('Cannot transition')) {
      return res.status(400).json({ error: error.message });
    }
    logger.logError(error, { context: 'content.changeStage', contentId: req.params.id });
    res.status(500).json({ error: 'Error changing content stage' });
  }
});

// POST /api/content/:id/request-approval - Request approval
router.post('/:id/request-approval', authenticate, [
  body('approverIds').isArray({ min: 1 }).withMessage('At least one approver is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const content = await Content.findById(req.params.id);

    if (!content) {
      return res.status(404).json({ error: 'Content not found' });
    }

    const { approverIds } = req.body;
    await content.requestApproval(approverIds, req.user._id);

    await content.populate('pendingApprovals.user', 'firstName lastName email');

    logger.info('Approval requested', { contentId: content._id, approvers: approverIds });
    res.json({ content });
  } catch (error) {
    logger.logError(error, { context: 'content.requestApproval', contentId: req.params.id });
    res.status(500).json({ error: 'Error requesting approval' });
  }
});

// POST /api/content/:id/approve - Approve or reject content
router.post('/:id/approve', authenticate, [
  body('approved').isBoolean(),
  body('note').optional().isLength({ max: 500 })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const content = await Content.findById(req.params.id);

    if (!content) {
      return res.status(404).json({ error: 'Content not found' });
    }

    // Check if user is a pending approver
    const isPendingApprover = content.pendingApprovals.some(
      p => p.user.toString() === req.user._id.toString()
    );

    if (!isPendingApprover && req.user.role !== 'system') {
      return res.status(403).json({ error: 'You are not an approver for this content' });
    }

    const { approved, note } = req.body;
    await content.addApproval(req.user._id, approved, note);

    await content.populate([
      { path: 'approvedBy', select: 'firstName lastName email' },
      { path: 'comments.user', select: 'firstName lastName email' }
    ]);

    logger.info('Content approval processed', {
      contentId: content._id,
      approved,
      userId: req.user._id
    });
    res.json({ content });
  } catch (error) {
    logger.logError(error, { context: 'content.approve', contentId: req.params.id });
    res.status(500).json({ error: 'Error processing approval' });
  }
});

// POST /api/content/:id/comment - Add comment
router.post('/:id/comment', authenticate, [
  body('text').trim().notEmpty().isLength({ max: 2000 }),
  body('type').optional().isIn(['comment', 'revision_request'])
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const content = await Content.findById(req.params.id);

    if (!content) {
      return res.status(404).json({ error: 'Content not found' });
    }

    const { text, type } = req.body;

    content.comments.push({
      user: req.user._id,
      text,
      type: type || 'comment'
    });

    await content.save();
    await content.populate('comments.user', 'firstName lastName email');

    logger.info('Comment added', { contentId: content._id, userId: req.user._id });
    res.json({ comments: content.comments });
  } catch (error) {
    logger.logError(error, { context: 'content.comment', contentId: req.params.id });
    res.status(500).json({ error: 'Error adding comment' });
  }
});

// POST /api/content/:id/schedule - Schedule content
router.post('/:id/schedule', authenticate, [
  body('scheduledFor').isISO8601().withMessage('Valid date is required'),
  body('timezone').optional()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const content = await Content.findById(req.params.id);

    if (!content) {
      return res.status(404).json({ error: 'Content not found' });
    }

    // Must be in approved stage to schedule
    if (content.stage !== 'approved' && content.stage !== 'scheduled') {
      return res.status(400).json({
        error: 'Content must be approved before scheduling',
        currentStage: content.stage
      });
    }

    const { scheduledFor, timezone } = req.body;

    // Validate date is in the future
    if (new Date(scheduledFor) <= new Date()) {
      return res.status(400).json({ error: 'Scheduled date must be in the future' });
    }

    content.scheduledFor = new Date(scheduledFor);
    content.timezone = timezone || content.timezone || 'UTC';
    content.stage = 'scheduled';

    await content.save();

    logger.info('Content scheduled', { contentId: content._id, scheduledFor });
    res.json({ content });
  } catch (error) {
    logger.logError(error, { context: 'content.schedule', contentId: req.params.id });
    res.status(500).json({ error: 'Error scheduling content' });
  }
});

// POST /api/content/:id/duplicate - Duplicate content
router.post('/:id/duplicate', authenticate, async (req, res) => {
  try {
    const original = await Content.findById(req.params.id);

    if (!original) {
      return res.status(404).json({ error: 'Content not found' });
    }

    const duplicate = new Content({
      ...original.toObject(),
      _id: undefined,
      title: `${original.title} (Copy)`,
      stage: 'draft',
      scheduledFor: null,
      publishedAt: null,
      publishingResults: [],
      analytics: {},
      comments: [],
      versions: [],
      currentVersion: 1,
      parentContent: null,
      recurringInstances: [],
      createdBy: req.user._id,
      assignedTo: req.user._id,
      approvedBy: null,
      approvedAt: null,
      pendingApprovals: [],
      createdAt: undefined,
      updatedAt: undefined
    });

    await duplicate.save();
    await duplicate.populate([
      { path: 'createdBy', select: 'firstName lastName email' },
      { path: 'campaign', select: 'name color' }
    ]);

    logger.info('Content duplicated', { originalId: original._id, duplicateId: duplicate._id });
    res.status(201).json({ content: duplicate });
  } catch (error) {
    logger.logError(error, { context: 'content.duplicate', contentId: req.params.id });
    res.status(500).json({ error: 'Error duplicating content' });
  }
});

// POST /api/content/:id/create-recurring-instance - Create next recurring instance
router.post('/:id/create-recurring-instance', authenticate, async (req, res) => {
  try {
    const content = await Content.findById(req.params.id);

    if (!content) {
      return res.status(404).json({ error: 'Content not found' });
    }

    if (!content.isRecurring) {
      return res.status(400).json({ error: 'Content is not recurring' });
    }

    // Check if max occurrences reached
    if (content.recurrence.maxOccurrences &&
        content.recurrence.occurrenceCount >= content.recurrence.maxOccurrences) {
      return res.status(400).json({ error: 'Maximum occurrences reached' });
    }

    // Check if past end date
    if (content.recurrence.endDate && new Date() > content.recurrence.endDate) {
      return res.status(400).json({ error: 'Recurrence end date has passed' });
    }

    const nextDate = req.body.scheduledFor
      ? new Date(req.body.scheduledFor)
      : content.getNextOccurrence();

    if (!nextDate) {
      return res.status(400).json({ error: 'Could not determine next occurrence date' });
    }

    const instance = await content.createRecurringInstance(nextDate);

    await instance.populate([
      { path: 'createdBy', select: 'firstName lastName email' },
      { path: 'campaign', select: 'name color' }
    ]);

    logger.info('Recurring instance created', {
      parentId: content._id,
      instanceId: instance._id,
      scheduledFor: nextDate
    });

    res.status(201).json({ content: instance });
  } catch (error) {
    logger.logError(error, { context: 'content.createRecurringInstance', contentId: req.params.id });
    res.status(500).json({ error: 'Error creating recurring instance' });
  }
});

// DELETE /api/content/:id - Soft delete content
router.delete('/:id', authenticate, async (req, res) => {
  try {
    const content = await Content.findById(req.params.id);

    if (!content) {
      return res.status(404).json({ error: 'Content not found' });
    }

    // Check permission
    const canDelete = content.createdBy.toString() === req.user._id.toString() ||
      req.user.role === 'system';

    if (!canDelete) {
      return res.status(403).json({ error: 'Not authorized to delete this content' });
    }

    await content.softDelete(req.user._id);

    // Update campaign counts
    if (content.campaign) {
      const campaign = await Campaign.findById(content.campaign);
      if (campaign) await campaign.updateContentCounts();
    }

    logger.info('Content deleted', { contentId: content._id, userId: req.user._id });
    res.json({ message: 'Content deleted successfully' });
  } catch (error) {
    logger.logError(error, { context: 'content.delete', contentId: req.params.id });
    res.status(500).json({ error: 'Error deleting content' });
  }
});

module.exports = router;
