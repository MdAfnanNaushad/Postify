/**
 * Middleware to enforce role-based authorization for moderators and administrators.
 */

const requireModerator = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: 'Authentication required.'
    });
  }

  if (req.user.role !== 'moderator' && req.user.role !== 'admin') {
    return res.status(403).json({
      success: false,
      message: 'Forbidden: Moderator or administrator privileges required.'
    });
  }

  next();
};

const requireAdmin = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: 'Authentication required.'
    });
  }

  if (req.user.role !== 'admin') {
    return res.status(403).json({
      success: false,
      message: 'Forbidden: Administrator privileges required.'
    });
  }

  next();
};

module.exports = { requireModerator, requireAdmin };
