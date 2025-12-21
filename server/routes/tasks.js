const express = require('express');
const router = express.Router();
const { body, param, query, validationResult } = require('express-validator');
const Task = require('../models/Task');
const Activity = require('../models/Activity');
const { authenticate } = require('../middleware/auth');
const {
  requireWorkspaceAccess,
  requirePermission,
  attachWorkspaceContext
} = require('../middleware/permissions');
const {
  TASK_STATUSES,
  TASK_TYPES,
  TASK_PRIORITIES,
  PERMISSIONS,
  ACTIVITY_TYPES
} = require('../config/constants');

/**
 * Task Routes
 *
 * RESTful API for task management.
 * Tasks are explicit work items that can be associated with content or campaigns.
 */

// Apply authentication to all routes
router.use(authenticate);
router.use(attachWorkspaceContext);

// Validation middleware
const handleValidation = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  next();
};

// Common task validations
const taskValidation = [
  body('title').notEmpty().trim().isLength({ max: 200 }).withMessage('Title is required and max 200 characters'),
  body('description').optional().trim().isLength({ max: 2000 }),
  body('type').optional().isIn(Object.values(TASK_TYPES)),
  body('priority').optional().isIn(Object.values(TASK_PRIORITIES)),
  body('dueDate').optional().isISO8601(),
  body('startDate').optional().isISO8601(),
  body('assignedTo').optional().isMongoId(),
  body('content').optional().isMongoId(),
  body('campaign').optional().isMongoId()
];

/**
 * GET /tasks
 * Get tasks with filters
 */
router.get('/',
  [
    query('status').optional().isIn(Object.values(TASK_STATUSES)),
    query('priority').optional().isIn(Object.values(TASK_PRIORITIES)),
    query('type').optional().isIn(Object.values(TASK_TYPES)),
    query('assignedTo').optional().isMongoId(),
    query('campaign').optional().isMongoId(),
    query('content').optional().isMongoId(),
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 100 })
  ],
  handleValidation,
  requireWorkspaceAccess,
  async (req, res) => {
    try {
      const {
        status,
        priority,
        type,
        assignedTo,
        campaign,
        content,
        page = 1,
        limit = 50,
        overdue,
        my
      } = req.query;

      const query = {
        workspace: req.workspaceId,
        deletedAt: null
      };

      // Apply filters
      if (status) query.status = status;
      if (priority) query.priority = priority;
      if (type) query.type = type;
      if (assignedTo) query.assignedTo = assignedTo;
      if (campaign) query.campaign = campaign;
      if (content) query.content = content;

      // My tasks filter
      if (my === 'true') {
        query.$or = [
          { assignedTo: req.user._id },
          { createdBy: req.user._id }
        ];
      }

      // Overdue filter
      if (overdue === 'true') {
        query.dueDate = { $lt: new Date() };
        query.status = { $nin: [TASK_STATUSES.COMPLETED, TASK_STATUSES.CANCELLED] };
      }

      const [tasks, total] = await Promise.all([
        Task.find(query)
          .populate('assignedTo', 'firstName lastName email profilePicture')
          .populate('createdBy', 'firstName lastName email')
          .populate('content', 'title stage')
          .populate('campaign', 'name color')
          .populate('labels', 'name color')
          .populate('dependsOn', 'title status')
          .sort({ priority: -1, dueDate: 1, createdAt: -1 })
          .skip((page - 1) * limit)
          .limit(parseInt(limit)),
        Task.countDocuments(query)
      ]);

      res.json({
        tasks,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          totalPages: Math.ceil(total / limit)
        }
      });
    } catch (error) {
      console.error('Error fetching tasks:', error);
      res.status(500).json({ error: 'Failed to fetch tasks' });
    }
  }
);

/**
 * GET /tasks/inbox
 * Get inbox items for current user
 */
router.get('/inbox',
  requireWorkspaceAccess,
  async (req, res) => {
    try {
      const result = await Task.getForInbox(req.user._id, req.workspaceId, {
        status: req.query.status,
        priority: req.query.priority,
        limit: parseInt(req.query.limit) || 50,
        page: parseInt(req.query.page) || 1
      });

      res.json(result);
    } catch (error) {
      console.error('Error fetching inbox tasks:', error);
      res.status(500).json({ error: 'Failed to fetch inbox tasks' });
    }
  }
);

/**
 * GET /tasks/overdue
 * Get overdue tasks
 */
router.get('/overdue',
  requireWorkspaceAccess,
  async (req, res) => {
    try {
      const tasks = await Task.getOverdue(req.workspaceId);
      res.json({ tasks, count: tasks.length });
    } catch (error) {
      console.error('Error fetching overdue tasks:', error);
      res.status(500).json({ error: 'Failed to fetch overdue tasks' });
    }
  }
);

/**
 * GET /tasks/stats
 * Get task statistics
 */
router.get('/stats',
  requireWorkspaceAccess,
  async (req, res) => {
    try {
      const stats = await Task.getStats(req.workspaceId);

      // Get additional stats
      const [myTasks, dueSoon] = await Promise.all([
        Task.countDocuments({
          workspace: req.workspaceId,
          assignedTo: req.user._id,
          status: { $nin: [TASK_STATUSES.COMPLETED, TASK_STATUSES.CANCELLED] },
          deletedAt: null
        }),
        Task.countDocuments({
          workspace: req.workspaceId,
          status: { $nin: [TASK_STATUSES.COMPLETED, TASK_STATUSES.CANCELLED] },
          dueDate: {
            $gte: new Date(),
            $lte: new Date(Date.now() + 24 * 60 * 60 * 1000)
          },
          deletedAt: null
        })
      ]);

      res.json({
        ...stats,
        myTasks,
        dueSoon
      });
    } catch (error) {
      console.error('Error fetching task stats:', error);
      res.status(500).json({ error: 'Failed to fetch task statistics' });
    }
  }
);

/**
 * GET /tasks/gantt/:campaignId
 * Get tasks for Gantt chart
 */
router.get('/gantt/:campaignId',
  [param('campaignId').isMongoId()],
  handleValidation,
  async (req, res) => {
    try {
      const tasks = await Task.getForGantt(req.params.campaignId);

      // Transform for Gantt chart format
      const ganttData = tasks.map(task => ({
        id: task._id,
        name: task.title,
        start: task.startDate || task.createdAt,
        end: task.dueDate,
        progress: task.progress,
        dependencies: task.dependsOn.map(d => d._id),
        assignee: task.assignedTo ? {
          name: `${task.assignedTo.firstName} ${task.assignedTo.lastName}`,
          avatar: task.assignedTo.profilePicture
        } : null,
        status: task.status,
        type: task.type
      }));

      res.json({ tasks: ganttData });
    } catch (error) {
      console.error('Error fetching Gantt data:', error);
      res.status(500).json({ error: 'Failed to fetch Gantt data' });
    }
  }
);

/**
 * GET /tasks/:id
 * Get single task
 */
router.get('/:id',
  [param('id').isMongoId()],
  handleValidation,
  async (req, res) => {
    try {
      const task = await Task.findById(req.params.id)
        .populate('assignedTo', 'firstName lastName email profilePicture')
        .populate('assignedBy', 'firstName lastName email')
        .populate('createdBy', 'firstName lastName email')
        .populate('completedBy', 'firstName lastName email')
        .populate('content', 'title stage platforms')
        .populate('campaign', 'name color status')
        .populate('labels', 'name color')
        .populate('dependsOn', 'title status dueDate')
        .populate('blockedBy', 'title status')
        .populate('comments.user', 'firstName lastName email profilePicture');

      if (!task) {
        return res.status(404).json({ error: 'Task not found' });
      }

      if (task.deletedAt) {
        return res.status(404).json({ error: 'Task has been deleted' });
      }

      res.json({ task });
    } catch (error) {
      console.error('Error fetching task:', error);
      res.status(500).json({ error: 'Failed to fetch task' });
    }
  }
);

/**
 * POST /tasks
 * Create new task
 */
router.post('/',
  taskValidation,
  handleValidation,
  requireWorkspaceAccess,
  async (req, res) => {
    try {
      const task = new Task({
        ...req.body,
        workspace: req.workspaceId,
        createdBy: req.user._id
      });

      // If assigned to someone, set assigned metadata
      if (req.body.assignedTo) {
        task.assignedBy = req.user._id;
        task.assignedAt = new Date();
      }

      await task.save();

      // Populate for response
      await task.populate([
        { path: 'assignedTo', select: 'firstName lastName email profilePicture' },
        { path: 'content', select: 'title stage' },
        { path: 'campaign', select: 'name color' }
      ]);

      // Log activity
      await Activity.create({
        workspace: req.workspaceId,
        action: ACTIVITY_TYPES.TASK_CREATED,
        actor: req.user._id,
        targetType: 'Task',
        targetId: task._id,
        targetName: task.title,
        metadata: {
          taskType: task.type,
          assignedTo: task.assignedTo?._id
        }
      });

      res.status(201).json({ task });
    } catch (error) {
      console.error('Error creating task:', error);
      res.status(500).json({ error: 'Failed to create task' });
    }
  }
);

/**
 * PUT /tasks/:id
 * Update task
 */
router.put('/:id',
  [
    param('id').isMongoId(),
    ...taskValidation.map(v => v.optional())
  ],
  handleValidation,
  async (req, res) => {
    try {
      const task = await Task.findById(req.params.id);

      if (!task) {
        return res.status(404).json({ error: 'Task not found' });
      }

      if (task.deletedAt) {
        return res.status(400).json({ error: 'Cannot update deleted task' });
      }

      // Track changes for activity log
      const changes = {};
      const updateFields = ['title', 'description', 'type', 'priority', 'status', 'dueDate', 'startDate', 'estimatedTime'];

      updateFields.forEach(field => {
        if (req.body[field] !== undefined && req.body[field] !== task[field]) {
          changes[field] = { from: task[field], to: req.body[field] };
          task[field] = req.body[field];
        }
      });

      // Handle assignment change
      if (req.body.assignedTo !== undefined) {
        const oldAssignee = task.assignedTo?.toString();
        const newAssignee = req.body.assignedTo;

        if (oldAssignee !== newAssignee) {
          task.assignedTo = newAssignee;
          task.assignedBy = req.user._id;
          task.assignedAt = new Date();
          changes.assignedTo = { from: oldAssignee, to: newAssignee };
        }
      }

      // Handle tags
      if (req.body.tags) {
        task.tags = req.body.tags;
      }

      // Handle labels
      if (req.body.labels) {
        task.labels = req.body.labels;
      }

      await task.save();

      await task.populate([
        { path: 'assignedTo', select: 'firstName lastName email profilePicture' },
        { path: 'content', select: 'title stage' },
        { path: 'campaign', select: 'name color' }
      ]);

      // Log activity if there were changes
      if (Object.keys(changes).length > 0) {
        await Activity.create({
          workspace: task.workspace,
          action: ACTIVITY_TYPES.TASK_UPDATED,
          actor: req.user._id,
          targetType: 'Task',
          targetId: task._id,
          targetName: task.title,
          changes
        });
      }

      res.json({ task });
    } catch (error) {
      console.error('Error updating task:', error);
      res.status(500).json({ error: 'Failed to update task' });
    }
  }
);

/**
 * POST /tasks/:id/start
 * Start a task
 */
router.post('/:id/start',
  [param('id').isMongoId()],
  handleValidation,
  async (req, res) => {
    try {
      const task = await Task.findById(req.params.id);

      if (!task) {
        return res.status(404).json({ error: 'Task not found' });
      }

      await task.start(req.user._id);

      await task.populate('assignedTo', 'firstName lastName email profilePicture');

      res.json({ task });
    } catch (error) {
      console.error('Error starting task:', error);
      res.status(400).json({ error: error.message || 'Failed to start task' });
    }
  }
);

/**
 * POST /tasks/:id/complete
 * Complete a task
 */
router.post('/:id/complete',
  [
    param('id').isMongoId(),
    body('actualTime').optional().isInt({ min: 0 })
  ],
  handleValidation,
  async (req, res) => {
    try {
      const task = await Task.findById(req.params.id);

      if (!task) {
        return res.status(404).json({ error: 'Task not found' });
      }

      await task.complete(req.user._id, req.body.actualTime);

      // Log activity
      await Activity.create({
        workspace: task.workspace,
        action: ACTIVITY_TYPES.TASK_COMPLETED,
        actor: req.user._id,
        targetType: 'Task',
        targetId: task._id,
        targetName: task.title
      });

      await task.populate('assignedTo', 'firstName lastName email profilePicture');

      res.json({ task });
    } catch (error) {
      console.error('Error completing task:', error);
      res.status(400).json({ error: error.message || 'Failed to complete task' });
    }
  }
);

/**
 * POST /tasks/:id/assign
 * Assign task to user
 */
router.post('/:id/assign',
  [
    param('id').isMongoId(),
    body('userId').isMongoId()
  ],
  handleValidation,
  async (req, res) => {
    try {
      const task = await Task.findById(req.params.id);

      if (!task) {
        return res.status(404).json({ error: 'Task not found' });
      }

      await task.assign(req.body.userId, req.user._id);

      // Log activity
      await Activity.create({
        workspace: task.workspace,
        action: ACTIVITY_TYPES.TASK_ASSIGNED,
        actor: req.user._id,
        targetType: 'Task',
        targetId: task._id,
        targetName: task.title,
        metadata: { assignedTo: req.body.userId }
      });

      await task.populate('assignedTo', 'firstName lastName email profilePicture');

      res.json({ task });
    } catch (error) {
      console.error('Error assigning task:', error);
      res.status(500).json({ error: 'Failed to assign task' });
    }
  }
);

/**
 * POST /tasks/:id/comments
 * Add comment to task
 */
router.post('/:id/comments',
  [
    param('id').isMongoId(),
    body('text').notEmpty().trim().isLength({ max: 1000 })
  ],
  handleValidation,
  async (req, res) => {
    try {
      const task = await Task.findById(req.params.id);

      if (!task) {
        return res.status(404).json({ error: 'Task not found' });
      }

      await task.addComment(req.user._id, req.body.text);

      await task.populate('comments.user', 'firstName lastName email profilePicture');

      res.json({ task });
    } catch (error) {
      console.error('Error adding comment:', error);
      res.status(500).json({ error: 'Failed to add comment' });
    }
  }
);

/**
 * PUT /tasks/:id/checklist/:index
 * Update checklist item
 */
router.put('/:id/checklist/:index',
  [
    param('id').isMongoId(),
    param('index').isInt({ min: 0 }),
    body('completed').isBoolean()
  ],
  handleValidation,
  async (req, res) => {
    try {
      const task = await Task.findById(req.params.id);

      if (!task) {
        return res.status(404).json({ error: 'Task not found' });
      }

      await task.updateChecklistItem(
        parseInt(req.params.index),
        req.body.completed,
        req.user._id
      );

      res.json({ task });
    } catch (error) {
      console.error('Error updating checklist:', error);
      res.status(400).json({ error: error.message || 'Failed to update checklist' });
    }
  }
);

/**
 * POST /tasks/:id/checklist
 * Add checklist item
 */
router.post('/:id/checklist',
  [
    param('id').isMongoId(),
    body('text').notEmpty().trim()
  ],
  handleValidation,
  async (req, res) => {
    try {
      const task = await Task.findById(req.params.id);

      if (!task) {
        return res.status(404).json({ error: 'Task not found' });
      }

      task.checklist.push({
        text: req.body.text,
        completed: false
      });

      await task.save();

      res.json({ task });
    } catch (error) {
      console.error('Error adding checklist item:', error);
      res.status(500).json({ error: 'Failed to add checklist item' });
    }
  }
);

/**
 * DELETE /tasks/:id
 * Soft delete task
 */
router.delete('/:id',
  [param('id').isMongoId()],
  handleValidation,
  async (req, res) => {
    try {
      const task = await Task.findById(req.params.id);

      if (!task) {
        return res.status(404).json({ error: 'Task not found' });
      }

      await task.softDelete(req.user._id);

      res.json({ message: 'Task deleted successfully' });
    } catch (error) {
      console.error('Error deleting task:', error);
      res.status(500).json({ error: 'Failed to delete task' });
    }
  }
);

module.exports = router;
