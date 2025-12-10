const express = require('express');
const Project = require('../models/Project');
const User = require('../models/User');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

// GET /api/stats - Get dashboard statistics
router.get('/', authenticate, async (req, res) => {
  try {
    const [
      totalProjects,
      pendingProjects,
      inProgressProjects,
      finishedProjects,
      shelfProjects,
      totalUsers,
      usersByRole
    ] = await Promise.all([
      Project.countDocuments(),
      Project.countDocuments({ status: 'pending' }),
      Project.countDocuments({ status: 'in progress' }),
      Project.countDocuments({ status: 'finished' }),
      Project.countDocuments({ status: 'shelf' }),
      User.countDocuments(),
      User.aggregate([
        { $group: { _id: '$role', count: { $sum: 1 } } }
      ])
    ]);

    // Get projects by month (last 6 months)
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    const projectsByMonth = await Project.aggregate([
      {
        $match: {
          createdAt: { $gte: sixMonthsAgo }
        }
      },
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' }
          },
          count: { $sum: 1 }
        }
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } }
    ]);

    // Get recent projects
    const recentProjects = await Project.find()
      .populate('client', 'firstName lastName')
      .populate('designer', 'firstName lastName')
      .populate('marketeer', 'firstName lastName')
      .sort({ createdAt: -1 })
      .limit(5);

    res.json({
      stats: {
        totalProjects,
        pendingProjects,
        inProgressProjects,
        finishedProjects,
        shelfProjects,
        totalUsers
      },
      usersByRole: usersByRole.reduce((acc, item) => {
        acc[item._id] = item.count;
        return acc;
      }, {}),
      projectsByMonth,
      recentProjects
    });
  } catch (error) {
    console.error('Get stats error:', error);
    res.status(500).json({ error: 'Error fetching statistics' });
  }
});

// GET /api/stats/user - Get stats for current user
router.get('/user', authenticate, async (req, res) => {
  try {
    const userId = req.user._id;
    const role = req.user.role;

    let query = {};
    if (role === 'designer') {
      query.designer = userId;
    } else if (role === 'marketeer') {
      query.marketeer = userId;
    } else if (role === 'hybrid') {
      query.$or = [{ designer: userId }, { marketeer: userId }];
    } else if (role === 'client') {
      query.client = userId;
    }

    const [total, pending, inProgress, finished] = await Promise.all([
      Project.countDocuments(query),
      Project.countDocuments({ ...query, status: 'pending' }),
      Project.countDocuments({ ...query, status: 'in progress' }),
      Project.countDocuments({ ...query, status: 'finished' })
    ]);

    res.json({
      stats: {
        total,
        pending,
        inProgress,
        finished
      }
    });
  } catch (error) {
    console.error('Get user stats error:', error);
    res.status(500).json({ error: 'Error fetching user statistics' });
  }
});

module.exports = router;
