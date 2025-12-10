const jwt = require('jsonwebtoken');
const User = require('../models/User');
const logger = require('../utils/logger');

// Verify JWT token
const authenticate = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');

    if (!token) {
      logger.debug('Authentication failed: No token provided', {
        url: req.originalUrl,
        method: req.method,
        ip: req.ip
      });
      return res.status(401).json({ error: 'Authentication required' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.userId);

    if (!user) {
      logger.warn('Authentication failed: User not found', {
        userId: decoded.userId,
        url: req.originalUrl
      });
      return res.status(401).json({ error: 'User not found' });
    }

    logger.debug('User authenticated', {
      userId: user._id,
      role: user.role,
      url: req.originalUrl
    });

    req.user = user;
    req.token = token;
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      logger.debug('Authentication failed: Token expired', {
        url: req.originalUrl,
        expiredAt: error.expiredAt
      });
      return res.status(401).json({ error: 'Token expired' });
    }

    if (error.name === 'JsonWebTokenError') {
      logger.debug('Authentication failed: Invalid token', {
        url: req.originalUrl,
        message: error.message
      });
      return res.status(401).json({ error: 'Invalid token' });
    }

    logger.logError(error, {
      context: 'authenticate.middleware',
      url: req.originalUrl
    });
    res.status(401).json({ error: 'Authentication failed' });
  }
};

// Check if user has required role
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      logger.warn('Authorization failed: Insufficient permissions', {
        userId: req.user._id,
        userRole: req.user.role,
        requiredRoles: roles,
        url: req.originalUrl
      });
      return res.status(403).json({ error: 'Access denied. Insufficient permissions.' });
    }

    logger.debug('User authorized', {
      userId: req.user._id,
      role: req.user.role,
      url: req.originalUrl
    });
    next();
  };
};

// Check if user is system admin
const isSystemAdmin = (req, res, next) => {
  if (req.user.role !== 'system') {
    logger.warn('System admin check failed', {
      userId: req.user._id,
      userRole: req.user.role,
      url: req.originalUrl
    });
    return res.status(403).json({ error: 'Access denied. System admin required.' });
  }

  logger.debug('System admin access granted', {
    userId: req.user._id,
    url: req.originalUrl
  });
  next();
};

module.exports = {
  authenticate,
  authorize,
  isSystemAdmin
};
