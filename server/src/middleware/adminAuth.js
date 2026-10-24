/**
 * Admin Authentication & Authorization Middleware
 * Enforces server-side administrator privileges and login rate-limiting.
 */

const normalizeAdminRoute = (rawRoute) => {
  if (!rawRoute || typeof rawRoute !== 'string') {
    return '/admin-portal';
  }
  let trimmed = rawRoute.trim();
  if (!trimmed.startsWith('/')) {
    trimmed = '/' + trimmed;
  }
  return trimmed.replace(/\/+$/, '');
};

/**
 * Server-side authorization middleware for all protected admin endpoints
 */
const requireAdmin = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: 'Authentication required. Please sign in to the Admin Control Center.'
    });
  }

  if (req.user.role !== 'admin') {
    return res.status(403).json({
      success: false,
      message: 'Forbidden: Administrative privileges required. Access denied.'
    });
  }

  if (req.user.isSuspended) {
    return res.status(403).json({
      success: false,
      message: 'Forbidden: Account has been suspended.'
    });
  }

  next();
};

/**
 * Dedicated rate limiter for administrative login attempts
 * Prevents credential stuffing and brute-force password guessing
 */
const failedLoginAttempts = new Map();
const MAX_ATTEMPTS = 5;
const LOCKOUT_WINDOW_MS = 15 * 60 * 1000; // 15 minutes

const adminLoginLimiter = (req, res, next) => {
  const ip = req.ip || req.connection?.remoteAddress || '127.0.0.1';
  const now = Date.now();

  const record = failedLoginAttempts.get(ip);
  if (record) {
    if (now - record.firstAttempt < LOCKOUT_WINDOW_MS) {
      if (record.count >= MAX_ATTEMPTS) {
        const remainingMinutes = Math.ceil((LOCKOUT_WINDOW_MS - (now - record.firstAttempt)) / 60000);
        return res.status(429).json({
          success: false,
          message: `Too many failed administrative login attempts. Please try again in ${remainingMinutes} minute(s).`
        });
      }
    } else {
      // Lockout window expired, reset
      failedLoginAttempts.delete(ip);
    }
  }

  // Attach helper to record failure or reset on success
  res.recordAdminLoginAttempt = (success) => {
    if (success) {
      failedLoginAttempts.delete(ip);
    } else {
      const existing = failedLoginAttempts.get(ip);
      if (!existing || now - existing.firstAttempt >= LOCKOUT_WINDOW_MS) {
        failedLoginAttempts.set(ip, { count: 1, firstAttempt: now });
      } else {
        existing.count++;
      }
    }
  };

  next();
};

module.exports = {
  requireAdmin,
  adminLoginLimiter,
  normalizeAdminRoute
};
