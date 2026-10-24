const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const User = require('../../models/user');
const AuditLog = require('../../models/auditLog');
const { getJwtSecret } = require('../../middleware/auth');
const { normalizeAdminRoute } = require('../../middleware/adminAuth');

/**
 * Helper to ensure a bootstrap admin record exists in MongoDB
 * without altering production passwords or storing env secrets in plain text.
 */
const getOrCreateBootstrapAdmin = async (email) => {
  const normalizedEmail = email.toLowerCase().trim();
  let adminUser = await User.findOne({ email: normalizedEmail });

  if (!adminUser) {
    // Generate a secure random password hash for the bootstrap record
    const salt = await bcrypt.genSalt(10);
    const randomHash = await bcrypt.hash(Math.random().toString(36) + Date.now(), salt);

    adminUser = await User.create({
      username: 'admin_' + Math.random().toString(36).substring(2, 7),
      email: normalizedEmail,
      name: 'System Administrator',
      password: randomHash,
      role: 'admin',
      isSuspended: false
    });
  } else if (adminUser.role !== 'admin') {
    adminUser.role = 'admin';
    await adminUser.save();
  }

  return adminUser;
};

/**
 * @desc    Authenticate administrator using bootstrap env credentials or DB admin user
 * @route   POST /api/admin/auth/login
 * @access  Public (Rate limited)
 */
exports.adminLogin = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      if (typeof res.recordAdminLoginAttempt === 'function') {
        res.recordAdminLoginAttempt(false);
      }
      return res.status(400).json({
        success: false,
        message: 'Administrative email and password are required.'
      });
    }

    const inputEmail = String(email).trim().toLowerCase();
    const inputPassword = String(password);

    const envAdminEmail = (process.env.ADMIN_EMAIL || '').trim().toLowerCase();
    const envAdminPassword = process.env.ADMIN_PASSWORD || '';

    let authenticatedAdmin = null;

    // 1. Verify bootstrap administrator credentials from environment
    if (
      envAdminEmail &&
      envAdminPassword &&
      inputEmail === envAdminEmail &&
      inputPassword === envAdminPassword
    ) {
      authenticatedAdmin = await getOrCreateBootstrapAdmin(envAdminEmail);
    }

    // 2. Fallback: verify against existing registered user with role === 'admin'
    if (!authenticatedAdmin) {
      const dbUser = await User.findOne({ email: inputEmail });
      if (dbUser && dbUser.role === 'admin' && !dbUser.isSuspended) {
        const isMatch = await bcrypt.compare(inputPassword, dbUser.password);
        if (isMatch) {
          authenticatedAdmin = dbUser;
        }
      }
    }

    if (!authenticatedAdmin) {
      if (typeof res.recordAdminLoginAttempt === 'function') {
        res.recordAdminLoginAttempt(false);
      }
      return res.status(401).json({
        success: false,
        message: 'Invalid administrative email or password.'
      });
    }

    // Check suspension
    if (authenticatedAdmin.isSuspended) {
      if (typeof res.recordAdminLoginAttempt === 'function') {
        res.recordAdminLoginAttempt(false);
      }
      return res.status(403).json({
        success: false,
        message: 'Administrator account has been suspended.'
      });
    }

    // Reset rate limiter on successful authentication
    if (typeof res.recordAdminLoginAttempt === 'function') {
      res.recordAdminLoginAttempt(true);
    }

    // Sign JWT token
    const secret = getJwtSecret();
    const token = jwt.sign(
      {
        userid: authenticatedAdmin._id.toString(),
        id: authenticatedAdmin._id.toString(),
        role: 'admin',
        isAdminSession: true
      },
      secret,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );

    // Set secure HTTP-only cookie
    const isProd = process.env.NODE_ENV === 'production';
    const cookieOptions = {
      httpOnly: true,
      secure: isProd,
      sameSite: isProd ? 'none' : 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
    };

    res.cookie('token', token, cookieOptions);
    res.cookie('admin_token', token, cookieOptions);

    // Record audit event safely
    try {
      await AuditLog.create({
        actor: authenticatedAdmin._id,
        action: 'assign_role',
        targetType: 'user',
        targetId: authenticatedAdmin._id,
        reason: 'Administrator authenticated session established',
        details: {
          sessionEstablishedAt: new Date().toISOString()
        }
      });
    } catch (auditErr) {
      // Don't fail login if audit creation encounters minor validation
    }

    res.status(200).json({
      success: true,
      message: 'Administrator session established successfully.',
      token,
      admin: {
        id: authenticatedAdmin._id,
        username: authenticatedAdmin.username,
        name: authenticatedAdmin.name,
        email: authenticatedAdmin.email,
        role: 'admin'
      }
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    End administrator session and invalidate cookie
 * @route   POST /api/admin/auth/logout
 * @access  Private (Admin)
 */
exports.adminLogout = async (req, res) => {
  const isProd = process.env.NODE_ENV === 'production';
  const clearOptions = {
    httpOnly: true,
    secure: isProd,
    sameSite: isProd ? 'none' : 'lax'
  };

  res.clearCookie('token', clearOptions);
  res.clearCookie('admin_token', clearOptions);

  res.status(200).json({
    success: true,
    message: 'Administrator logged out successfully.'
  });
};

/**
 * @desc    Get active administrator session details
 * @route   GET /api/admin/auth/session
 * @access  Private (Admin)
 */
exports.getAdminSession = async (req, res) => {
  res.status(200).json({
    success: true,
    admin: {
      id: req.user._id,
      username: req.user.username,
      name: req.user.name,
      email: req.user.email,
      role: req.user.role,
      Profilepic: req.user.Profilepic,
      createdAt: req.user.createdAt
    }
  });
};

/**
 * @desc    Safely verify if an entered frontend path corresponds to the configured admin route
 *          Never returns the actual secret route string if invalid.
 * @route   POST /api/admin/auth/verify-route
 * @access  Public
 */
exports.verifyAdminRoute = async (req, res) => {
  const { path: enteredPath } = req.body;
  if (!enteredPath) {
    return res.status(400).json({ success: false, valid: false });
  }

  const configuredRoute = normalizeAdminRoute(process.env.ADMIN_ROUTE);
  const baseRoute = configuredRoute.replace(/\/login$/i, '') || configuredRoute;
  const normalizedEntered = normalizeAdminRoute(enteredPath);

  const isValid =
    normalizedEntered.toLowerCase() === configuredRoute.toLowerCase() ||
    normalizedEntered.toLowerCase() === baseRoute.toLowerCase() ||
    normalizedEntered.toLowerCase().startsWith(baseRoute.toLowerCase() + '/') ||
    normalizedEntered.toLowerCase().startsWith(configuredRoute.toLowerCase() + '/');

  res.status(200).json({
    success: true,
    valid: isValid
  });
};
