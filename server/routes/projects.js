const express = require('express');
const { body, query, validationResult } = require('express-validator');
const Project = require('../models/Project');
const ProjectHistory = require('../models/ProjectHistory');
const Prompt = require('../models/Prompt');
const { authenticate, authorize } = require('../middleware/auth');
const { sanitizeContent, generateSlogan } = require('../utils/helpers');
const { uploadProjectImage, deleteFromS3, getKeyFromUrl } = require('../config/s3');

const router = express.Router();

// Helper to get projects based on user role
const getProjectsQuery = (user, status = null) => {
  let query = {};

  if (status === 'shelf') {
    query.status = 'shelf';
  } else if (status === 'active') {
    query.status = { $ne: 'shelf' };
  }

  if (user.role === 'system') {
    return query;
  } else if (user.role === 'marketeer') {
    query.marketeer = user._id;
  } else if (user.role === 'designer') {
    query.designer = user._id;
  } else if (user.role === 'hybrid') {
    query.$or = [
      { designer: user._id },
      { marketeer: user._id }
    ];
  } else {
    // client
    query.client = user._id;
  }

  return query;
};

// GET /api/projects - Get all projects (with pagination)
router.get('/', authenticate, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const status = req.query.status || 'active';
    const skip = (page - 1) * limit;

    const query = getProjectsQuery(req.user, status);

    const [projects, total] = await Promise.all([
      Project.find(query)
        .populate('designer', 'firstName lastName')
        .populate('marketeer', 'firstName lastName')
        .populate('client', 'firstName lastName')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Project.countDocuments(query)
    ]);

    res.json({
      projects,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Get projects error:', error);
    res.status(500).json({ error: 'Error fetching projects' });
  }
});

// GET /api/projects/calendar - Get projects for calendar view
router.get('/calendar', authenticate, async (req, res) => {
  try {
    const { month, year, clientId } = req.query;
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0, 23, 59, 59);

    let query = {
      startDatetime: { $gte: startDate, $lte: endDate }
    };

    if (clientId) {
      query.client = clientId;
    }

    const projects = await Project.find(query)
      .populate('client', 'firstName lastName')
      .select('campaignName startDatetime endDatetime status client');

    // Group by date
    const eventDict = {};
    projects.forEach(project => {
      if (project.startDatetime) {
        const dateKey = project.startDatetime.toISOString().split('T')[0];
        if (!eventDict[dateKey]) {
          eventDict[dateKey] = [];
        }
        eventDict[dateKey].push({
          id: project._id,
          name: project.campaignName,
          status: project.status
        });
      }
    });

    res.json({ events: eventDict });
  } catch (error) {
    console.error('Get calendar events error:', error);
    res.status(500).json({ error: 'Error fetching calendar events' });
  }
});

// GET /api/projects/:id - Get single project
router.get('/:id', authenticate, async (req, res) => {
  try {
    const project = await Project.findById(req.params.id)
      .populate('designer', 'firstName lastName email')
      .populate('marketeer', 'firstName lastName email')
      .populate('client', 'firstName lastName email')
      .populate('userId', 'firstName lastName');

    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    res.json({ project });
  } catch (error) {
    console.error('Get project error:', error);
    res.status(500).json({ error: 'Error fetching project' });
  }
});

// POST /api/projects - Create new project
router.post('/', authenticate, [
  body('campaignName').trim().isLength({ min: 1, max: 100 }),
  body('details').optional().trim(),
  body('suggestedSlogan').optional().trim(),
  body('status').optional().isIn(['pending', 'in progress', 'finished', 'shelf']),
  body('startDatetime').optional().isISO8601(),
  body('endDatetime').optional().isISO8601()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const {
      campaignName,
      details,
      suggestedSlogan,
      generatedSlogan,
      imageUrl,
      designer,
      marketeer,
      client,
      status,
      startDatetime,
      endDatetime
    } = req.body;

    // Validate datetime
    if (startDatetime && endDatetime) {
      if (new Date(startDatetime) >= new Date(endDatetime)) {
        return res.status(400).json({ error: 'End datetime must be after start datetime' });
      }
    }

    const project = new Project({
      campaignName,
      details: sanitizeContent(details),
      suggestedSlogan,
      generatedSlogan,
      imageUrl,
      designer: designer || null,
      marketeer: marketeer || null,
      client: client || null,
      status: status || 'pending',
      startDatetime: startDatetime ? new Date(startDatetime) : null,
      endDatetime: endDatetime ? new Date(endDatetime) : null,
      userId: req.user._id
    });

    await project.save();

    // Log history
    await ProjectHistory.create({
      project: project._id,
      user: req.user._id,
      action: 'created',
      newValue: campaignName
    });

    const populatedProject = await Project.findById(project._id)
      .populate('designer', 'firstName lastName')
      .populate('marketeer', 'firstName lastName')
      .populate('client', 'firstName lastName');

    res.status(201).json({
      message: 'Project created successfully',
      project: populatedProject
    });
  } catch (error) {
    console.error('Create project error:', error);
    res.status(500).json({ error: 'Error creating project' });
  }
});

// POST /api/projects/:id/upload-image - Upload project image to S3
router.post('/:id/upload-image', authenticate, uploadProjectImage.single('image'), async (req, res) => {
  try {
    const project = await Project.findById(req.params.id);

    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    if (!req.file) {
      return res.status(400).json({ error: 'No image file provided' });
    }

    // Delete old image from S3 if exists
    if (project.imgDesign) {
      const oldKey = getKeyFromUrl(project.imgDesign);
      if (oldKey) {
        await deleteFromS3(oldKey);
      }
    }

    // Update project with new S3 URL
    project.imgDesign = req.file.location;
    await project.save();

    res.json({
      message: 'Image uploaded successfully',
      imageUrl: req.file.location
    });
  } catch (error) {
    console.error('Upload image error:', error);
    res.status(500).json({ error: 'Error uploading image' });
  }
});

// PUT /api/projects/:id - Update project
router.put('/:id', authenticate, async (req, res) => {
  try {
    const project = await Project.findById(req.params.id);

    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    const allowedFields = [
      'campaignName', 'details', 'suggestedSlogan', 'generatedSlogan',
      'imageUrl', 'imgDesign', 'designer', 'marketeer', 'client',
      'status', 'startDatetime', 'endDatetime'
    ];

    const updates = {};
    const historyEntries = [];

    allowedFields.forEach(field => {
      if (req.body[field] !== undefined) {
        const oldValue = project[field];
        const newValue = req.body[field];

        if (oldValue !== newValue) {
          if (field === 'details') {
            updates[field] = sanitizeContent(newValue);
          } else {
            updates[field] = newValue;
          }

          historyEntries.push({
            project: project._id,
            user: req.user._id,
            action: field === 'status' ? 'status_changed' : 'updated',
            fieldName: field,
            oldValue: String(oldValue || ''),
            newValue: String(newValue || '')
          });
        }
      }
    });

    if (Object.keys(updates).length === 0) {
      return res.json({ message: 'No changes made', project });
    }

    // Validate datetime if both are being set
    const startDt = updates.startDatetime || project.startDatetime;
    const endDt = updates.endDatetime || project.endDatetime;
    if (startDt && endDt && new Date(startDt) >= new Date(endDt)) {
      return res.status(400).json({ error: 'End datetime must be after start datetime' });
    }

    const updatedProject = await Project.findByIdAndUpdate(
      req.params.id,
      updates,
      { new: true, runValidators: true }
    )
      .populate('designer', 'firstName lastName')
      .populate('marketeer', 'firstName lastName')
      .populate('client', 'firstName lastName');

    // Save history entries
    if (historyEntries.length > 0) {
      await ProjectHistory.insertMany(historyEntries);
    }

    res.json({
      message: 'Project updated successfully',
      project: updatedProject
    });
  } catch (error) {
    console.error('Update project error:', error);
    res.status(500).json({ error: 'Error updating project' });
  }
});

// POST /api/projects/:id/generate-slogan - Generate AI slogan
router.post('/:id/generate-slogan', authenticate, async (req, res) => {
  try {
    const project = await Project.findById(req.params.id);

    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    if (!project.suggestedSlogan) {
      return res.status(400).json({ error: 'No suggested slogan to base generation on' });
    }

    // Get system prompt
    const promptDoc = await Prompt.findOne();
    const systemPrompt = promptDoc?.prompt || 'You are a creative marketing copywriter.';

    const generatedSlogan = await generateSlogan(systemPrompt, project.suggestedSlogan);

    project.generatedSlogan = generatedSlogan;
    await project.save();

    res.json({
      message: 'Slogan generated successfully',
      generatedSlogan
    });
  } catch (error) {
    console.error('Generate slogan error:', error);
    res.status(500).json({ error: 'Error generating slogan' });
  }
});

// DELETE /api/projects/:id - Delete project (system admin only)
router.delete('/:id', authenticate, authorize('system'), async (req, res) => {
  try {
    const project = await Project.findById(req.params.id);

    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    // Delete image from S3 if exists
    if (project.imgDesign) {
      const imageKey = getKeyFromUrl(project.imgDesign);
      if (imageKey) {
        await deleteFromS3(imageKey);
      }
    }

    await Project.findByIdAndDelete(req.params.id);

    // Delete related history
    await ProjectHistory.deleteMany({ project: req.params.id });

    res.json({ message: 'Project deleted successfully' });
  } catch (error) {
    console.error('Delete project error:', error);
    res.status(500).json({ error: 'Error deleting project' });
  }
});

// GET /api/projects/:id/history - Get project history
router.get('/:id/history', authenticate, async (req, res) => {
  try {
    const history = await ProjectHistory.find({ project: req.params.id })
      .populate('user', 'firstName lastName')
      .sort({ createdAt: -1 });

    res.json({ history });
  } catch (error) {
    console.error('Get project history error:', error);
    res.status(500).json({ error: 'Error fetching project history' });
  }
});

module.exports = router;
