const jwt = require('jsonwebtoken');
const User = require('../models/user');

const getJwtSecret = () => {
  if (process.env.NODE_ENV === 'production') {
    if (
      !process.env.JWT_SECRET ||
      process.env.JWT_SECRET.length < 32 ||
      process.env.JWT_SECRET.includes('super_secure') ||
      process.env.JWT_SECRET === 'your_jwt_secret_key_here'
    ) {
      throw new Error('FATAL: Insecure or missing JWT_SECRET in production.');
    }
    return process.env.JWT_SECRET;
  }
  return process.env.JWT_SECRET || 'postify_super_secure_twilight_jwt_secret_2025_portal_key_!98';
};

const protect = async (req, res, next) => {
  let token;

  // 1. Check cookies for token (Primary HTTP-only auth method)
  if (req.cookies && req.cookies.token) {
    token = req.cookies.token;
  }
  // 2. Also support standard Authorization Bearer header for flexibility/testing
  else if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'Not authorized to access this resource. Please log in.'
    });
  }

  try {
    const secret = getJwtSecret();
    const decoded = jwt.verify(token, secret);

    const user = await User.findById(decoded.userid || decoded.id).select('-password');
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'The user belonging to this token no longer exists.'
      });
    }

    if (user.isSuspended) {
      return res.status(403).json({
        success: false,
        message: 'Your account has been suspended for violating community guidelines.'
      });
    }

    req.user = user;
    next();
  } catch (err) {
    return res.status(401).json({
      success: false,
      message: 'Token is invalid or expired. Please log in again.'
    });
  }
};

/**
 * Optional authentication middleware:
 * Populates req.user if a valid token is provided (cookie or Bearer),
 * but allows unauthenticated requests to proceed with req.user = null.
 */
const optionalAuth = async (req, res, next) => {
  let token;

  if (req.cookies && req.cookies.token) {
    token = req.cookies.token;
  } else if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    req.user = null;
    return next();
  }

  try {
    const secret = getJwtSecret();
    const decoded = jwt.verify(token, secret);
    const user = await User.findById(decoded.userid || decoded.id).select('-password');
    if (user && !user.isSuspended) {
      req.user = user;
    } else {
      req.user = null;
    }
  } catch (err) {
    req.user = null;
  }
  next();
};

module.exports = { protect, optionalAuth, getJwtSecret };
