const mongoose = require('mongoose');
const os = require('os');
const Digest = require('../../models/digest');
const { getTelemetryStats } = require('../../middleware/adminTelemetry');
const { getIO } = require('../../socket');

// @desc    Get system health and operational status
// @route   GET /api/admin/system/health
// @access  Private (Admin)
exports.getSystemHealth = async (req, res, next) => {
  try {
    const memory = process.memoryUsage();
    const uptime = Math.floor(process.uptime());

    // Measure MongoDB ping latency
    let dbPingMs = null;
    let dbStatus = 'disconnected';
    const dbState = mongoose.connection.readyState;

    if (dbState === 1 && mongoose.connection.db) {
      dbStatus = 'connected';
      try {
        const pingStart = Date.now();
        await mongoose.connection.db.admin().ping();
        dbPingMs = Date.now() - pingStart;
      } catch (pingErr) {
        dbStatus = 'degraded';
      }
    } else if (dbState === 2) {
      dbStatus = 'connecting';
    }

    // Get Socket.IO active connections count safely
    let socketConnections = 0;
    try {
      const io = getIO();
      if (io && io.engine) {
        socketConnections = io.engine.clientsCount || 0;
      }
    } catch {
      // Socket.IO not initialized or unavailable
    }

    const telemetry = getTelemetryStats();

    res.status(200).json({
      success: true,
      health: {
        status: dbStatus === 'connected' ? 'healthy' : 'degraded',
        timestamp: new Date().toISOString(),
        application: {
          name: 'Postify',
          version: '1.0.0',
          environment: process.env.NODE_ENV || 'development',
          nodeVersion: process.version,
          platform: process.platform,
          uptimeSeconds: uptime,
          uptimeFormatted: `${Math.floor(uptime / 3600)}h ${Math.floor((uptime % 3600) / 60)}m ${uptime % 60}s`,
          memory: {
            heapUsedMB: Math.round(memory.heapUsed / 1024 / 1024 * 100) / 100,
            heapTotalMB: Math.round(memory.heapTotal / 1024 / 1024 * 100) / 100,
            rssMB: Math.round(memory.rss / 1024 / 1024 * 100) / 100
          }
        },
        database: {
          status: dbStatus,
          readyState: dbState,
          pingMs: dbPingMs,
          host: mongoose.connection.host || 'local'
        },
        socket: {
          activeConnections: socketConnections
        },
        telemetry: {
          totalRequests: telemetry.totalRequests,
          errorRate: telemetry.errorRate,
          avgLatencyMs: telemetry.latency.avg,
          p95LatencyMs: telemetry.latency.p95
        }
      }
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Get API & Traffic Analytics from in-memory telemetry
// @route   GET /api/admin/system/traffic
// @access  Private (Admin)
exports.getTrafficAnalytics = async (req, res) => {
  const stats = getTelemetryStats();
  res.status(200).json({
    success: true,
    telemetry: stats
  });
};

// @desc    Get Background Jobs status (Digest runs)
// @route   GET /api/admin/system/jobs
// @access  Private (Admin)
exports.getBackgroundJobs = async (req, res, next) => {
  try {
    const digests = await Digest.find()
      .sort({ createdAt: -1 })
      .limit(20)
      .populate('user', 'username name email')
      .lean();

    // Group runs by periodKey
    const periodGroups = new Map();
    digests.forEach(d => {
      const key = d.periodKey || 'unknown';
      if (!periodGroups.has(key)) {
        periodGroups.set(key, {
          periodKey: key,
          latestRun: d.generatedAt || d.createdAt,
          totalDigests: 0,
          deliveredEmail: 0,
          skippedEmail: 0,
          failedEmail: 0
        });
      }
      const group = periodGroups.get(key);
      group.totalDigests++;
      if (d.deliveryStatus === 'email_sent') group.deliveredEmail++;
      if (d.deliveryStatus === 'email_skipped') group.skippedEmail++;
      if (d.deliveryStatus === 'email_failed') group.failedEmail++;
    });

    res.status(200).json({
      success: true,
      jobType: 'Weekly Developer Digest Cron',
      schedule: '0 0 * * 0 (Every Sunday at 00:00 UTC)',
      runs: Array.from(periodGroups.values()),
      recentTasks: digests.slice(0, 10).map(d => ({
        id: d._id,
        periodKey: d.periodKey,
        user: d.user?.username || 'Unknown',
        email: d.user?.email || 'N/A',
        status: d.deliveryStatus,
        createdAt: d.createdAt
      }))
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Get Resend email delivery observability
// @route   GET /api/admin/system/email-deliveries
// @access  Private (Admin)
exports.getEmailDeliveries = async (req, res, next) => {
  try {
    const [counts, ambiguousTimeouts, recentDeliveries] = await Promise.all([
      Digest.aggregate([
        { $group: { _id: '$deliveryStatus', count: { $sum: 1 } } }
      ]),
      Digest.countDocuments({ isAmbiguousTimeout: true }),
      Digest.find({ deliveryStatus: { $in: ['email_sent', 'email_failed', 'sending'] } })
        .sort({ updatedAt: -1 })
        .limit(25)
        .populate('user', 'username name email')
        .select('user periodKey deliveryStatus deliveryAttempts lastDeliveryAttemptAt deliveryError isAmbiguousTimeout emailMessageId')
        .lean()
    ]);

    const statusCounts = {};
    counts.forEach(c => {
      statusCounts[c._id || 'unknown'] = c.count;
    });

    res.status(200).json({
      success: true,
      provider: 'Resend',
      configured: Boolean(process.env.RESEND_API_KEY),
      senderAddress: process.env.RESEND_FROM_EMAIL || 'Not configured',
      statusSummary: statusCounts,
      ambiguousTimeoutCount: ambiguousTimeouts,
      deliveries: recentDeliveries
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Get Configuration Status Checklist (Safe booleans only, NEVER expose values)
// @route   GET /api/admin/system/config-status
// @access  Private (Admin)
exports.getConfigStatus = async (req, res) => {
  res.status(200).json({
    success: true,
    configuration: [
      {
        key: 'DATABASE_CONNECTION',
        label: 'MongoDB Connection String (MONGODB_URI)',
        configured: Boolean(process.env.MONGODB_URI),
        severity: 'critical',
        description: 'Primary database connection'
      },
      {
        key: 'JWT_SECRET',
        label: 'JWT Signing Secret (JWT_SECRET)',
        configured: Boolean(process.env.JWT_SECRET && process.env.JWT_SECRET.length >= 32),
        severity: 'critical',
        description: 'Session authentication signature key'
      },
      {
        key: 'ADMIN_ROUTE',
        label: 'Secret Administrative Path (ADMIN_ROUTE)',
        configured: Boolean(process.env.ADMIN_ROUTE),
        severity: 'high',
        description: 'Custom entry route for Admin Control Center'
      },
      {
        key: 'ADMIN_BOOTSTRAP_CREDENTIALS',
        label: 'Bootstrap Admin Credentials (ADMIN_EMAIL & ADMIN_PASSWORD)',
        configured: Boolean(process.env.ADMIN_EMAIL && process.env.ADMIN_PASSWORD),
        severity: 'high',
        description: 'Environment-backed administrator credentials'
      },
      {
        key: 'EMAIL_SERVICE',
        label: 'Resend Email Service (RESEND_API_KEY)',
        configured: Boolean(process.env.RESEND_API_KEY),
        severity: 'medium',
        description: 'Weekly digest email delivery provider'
      },
      {
        key: 'MEDIA_STORAGE',
        label: 'ImageKit Cloud Storage (IMAGEKIT_KEYS)',
        configured: Boolean(process.env.IMAGEKIT_PUBLIC_KEY && process.env.IMAGEKIT_PRIVATE_KEY),
        severity: 'low',
        description: 'Cloud media uploads storage'
      },
      {
        key: 'CORS_CANONICAL',
        label: 'Client Canonical Origin (CLIENT_URL)',
        configured: Boolean(process.env.CLIENT_URL),
        severity: 'medium',
        description: 'Permitted client origin for CORS and cookie authentication'
      }
    ]
  });
};
