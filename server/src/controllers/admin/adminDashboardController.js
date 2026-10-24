const mongoose = require('mongoose');
const User = require('../../models/user');
const Post = require('../../models/post');
const Reply = require('../../models/reply');
const Project = require('../../models/project');
const BuildLog = require('../../models/buildLog');
const Report = require('../../models/report');
const AuditLog = require('../../models/auditLog');
const Follow = require('../../models/follow');
const Repost = require('../../models/repost');
const Digest = require('../../models/digest');
const { getTelemetryStats } = require('../../middleware/adminTelemetry');

/**
 * Helper to calculate percentage change between current and prior period
 */
const calculateTrend = (current, prior) => {
  if (prior === 0) {
    return current > 0 ? 100 : 0;
  }
  return Math.round(((current - prior) / prior) * 1000) / 10;
};

/**
 * @desc    Get top-level KPI metrics across Community, Content, Engagement, Trust & Safety, and System
 * @route   GET /api/admin/dashboard
 * @access  Private (Admin)
 */
exports.getDashboardKpis = async (req, res, next) => {
  try {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfYesterday = new Date(startOfToday.getTime() - 24 * 60 * 60 * 1000);
    const start7d = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const start14d = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
    const start30d = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const start60d = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);

    // Parallel aggregations across distinct collections
    const [
      // 1. Community Counts
      totalUsers,
      newUsersToday,
      newUsersYesterday,
      newUsers7d,
      newUsersPrior7d,
      newUsers30d,
      activeUsersToday,
      activeUsers7d,
      activeUsers30d,
      suspendedUsers,
      incompleteProfiles,

      // 2. Content Counts
      totalPosts,
      postsToday,
      postsYesterday,
      posts7d,
      postsPrior7d,
      totalReplies,
      totalProjects,
      totalBuildLogs,
      hiddenPosts,
      hiddenReplies,
      hiddenProjects,
      hiddenLogs,

      // 3. Engagement Counts
      postLikesAgg,
      totalReposts,
      totalQuotes,
      totalFollows,

      // 4. Trust & Safety Counts
      openReports,
      pendingReports,
      resolvedReports,
      actions7d,
      reportsByReason,

      // 5. Operations
      lastDigest
    ] = await Promise.all([
      User.countDocuments({}),
      User.countDocuments({ createdAt: { $gte: startOfToday } }),
      User.countDocuments({ createdAt: { $gte: startOfYesterday, $lt: startOfToday } }),
      User.countDocuments({ createdAt: { $gte: start7d } }),
      User.countDocuments({ createdAt: { $gte: start14d, $lt: start7d } }),
      User.countDocuments({ createdAt: { $gte: start30d } }),
      User.countDocuments({ $or: [{ updatedAt: { $gte: startOfToday } }, { createdAt: { $gte: startOfToday } }] }),
      User.countDocuments({ $or: [{ updatedAt: { $gte: start7d } }, { createdAt: { $gte: start7d } }] }),
      User.countDocuments({ $or: [{ updatedAt: { $gte: start30d } }, { createdAt: { $gte: start30d } }] }),
      User.countDocuments({ isSuspended: true }),
      User.countDocuments({ $or: [{ bio: { $in: ['', null] } }, { githubUrl: { $in: ['', null] } }] }),

      Post.countDocuments({}),
      Post.countDocuments({ createdAt: { $gte: startOfToday } }),
      Post.countDocuments({ createdAt: { $gte: startOfYesterday, $lt: startOfToday } }),
      Post.countDocuments({ createdAt: { $gte: start7d } }),
      Post.countDocuments({ createdAt: { $gte: start14d, $lt: start7d } }),
      Reply.countDocuments({}),
      Project.countDocuments({}),
      BuildLog.countDocuments({}),
      Post.countDocuments({ isHidden: true }),
      Reply.countDocuments({ isHidden: true }),
      Project.countDocuments({ isHidden: true }),
      BuildLog.countDocuments({ isHidden: true }),

      Post.aggregate([
        { $project: { likeCount: { $size: { $ifNull: ['$likes', []] } } } },
        { $group: { _id: null, total: { $sum: '$likeCount' } } }
      ]),
      Repost.countDocuments({}),
      Post.countDocuments({ quotedPost: { $ne: null } }),
      Follow.countDocuments({}),

      Report.countDocuments({ status: { $in: ['pending', 'reviewed'] } }),
      Report.countDocuments({ status: 'pending' }),
      Report.countDocuments({ status: { $in: ['actioned', 'dismissed'] } }),
      AuditLog.countDocuments({ createdAt: { $gte: start7d } }),
      Report.aggregate([
        { $group: { _id: '$reason', count: { $sum: 1 } } },
        { $sort: { count: -1 } }
      ]),

      Digest.findOne().sort({ createdAt: -1 }).lean()
    ]);

    const totalLikes = (postLikesAgg[0] && postLikesAgg[0].total) || 0;
    const totalHiddenContent = hiddenPosts + hiddenReplies + hiddenProjects + hiddenLogs;

    // Derived engagement rate formula: (totalLikes + totalReplies + totalReposts) / totalPosts
    const engagementRate = totalPosts > 0
      ? Math.round(((totalLikes + totalReplies + totalReposts) / totalPosts) * 100) / 100
      : 0;

    // Telemetry and DB connectivity
    const telemetry = getTelemetryStats();
    const dbState = mongoose.connection.readyState;
    const dbStatus = dbState === 1 ? 'connected' : dbState === 2 ? 'connecting' : 'disconnected';

    res.status(200).json({
      success: true,
      data: {
        community: {
          totalUsers,
          newUsersToday,
          newUsers7d,
          newUsers30d,
          activeUsersToday,
          activeUsers7d,
          activeUsers30d,
          suspendedUsers,
          incompleteProfiles,
          trends: {
            usersToday: calculateTrend(newUsersToday, newUsersYesterday),
            users7d: calculateTrend(newUsers7d, newUsersPrior7d)
          }
        },
        content: {
          totalPosts,
          postsToday,
          posts7d,
          totalReplies,
          totalProjects,
          totalBuildLogs,
          hiddenContentCount: totalHiddenContent,
          pendingModerationCount: pendingReports,
          trends: {
            postsToday: calculateTrend(postsToday, postsYesterday),
            posts7d: calculateTrend(posts7d, postsPrior7d)
          }
        },
        engagement: {
          totalLikes,
          totalReplies,
          totalReposts,
          totalQuotes,
          totalFollows,
          engagementRate,
          engagementFormula: '(totalLikes + totalReplies + totalReposts) / totalPosts'
        },
        trustAndSafety: {
          openReports,
          pendingReports,
          resolvedReports,
          actions7d,
          reportsByReason: reportsByReason.map(r => ({ reason: r._id, count: r.count }))
        },
        system: {
          databaseStatus: dbStatus,
          apiRequests: telemetry.totalRequests,
          apiErrorRate: telemetry.errorRate,
          avgLatencyMs: telemetry.latency.avg,
          p95LatencyMs: telemetry.latency.p95,
          uptimeSeconds: telemetry.uptimeSeconds,
          lastDigestRun: lastDigest ? {
            periodKey: lastDigest.periodKey,
            generatedAt: lastDigest.generatedAt || lastDigest.createdAt,
            deliveryStatus: lastDigest.deliveryStatus
          } : null
        }
      }
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Get aggregated recent live activities across moderation, posts, and users
 * @route   GET /api/admin/activity
 * @access  Private (Admin)
 */
exports.getLiveActivity = async (req, res, next) => {
  try {
    const limit = Math.min(50, Math.max(10, parseInt(req.query.limit, 10) || 20));

    // Fetch recent events in parallel
    const [recentLogs, recentReports, recentPosts, recentUsers] = await Promise.all([
      AuditLog.find()
        .sort({ createdAt: -1 })
        .limit(10)
        .populate('actor', 'username name Profilepic')
        .lean(),
      Report.find()
        .sort({ createdAt: -1 })
        .limit(10)
        .populate('reporter', 'username name')
        .lean(),
      Post.find()
        .sort({ createdAt: -1 })
        .limit(10)
        .populate('user', 'username name Profilepic')
        .lean(),
      User.find()
        .sort({ createdAt: -1 })
        .limit(10)
        .select('username name Profilepic createdAt role isSuspended')
        .lean()
    ]);

    // Unify activities into consistent timeline items
    const activities = [];

    // Audit Log events
    recentLogs.forEach(log => {
      activities.push({
        id: `audit_${log._id}`,
        type: 'moderation_action',
        title: `Moderation: ${log.action.replace('_', ' ')}`,
        description: log.reason || `Target: ${log.targetType}`,
        timestamp: log.createdAt,
        actor: log.actor?.name || log.actor?.username || 'System Admin',
        severity: log.action.includes('suspend') || log.action.includes('hide') ? 'warning' : 'info'
      });
    });

    // Reports events
    recentReports.forEach(rep => {
      activities.push({
        id: `report_${rep._id}`,
        type: 'report_created',
        title: `Report Submitted (${rep.reason})`,
        description: `Target: ${rep.targetType} • Status: ${rep.status}`,
        timestamp: rep.createdAt,
        actor: rep.reporter?.username || 'Anonymous',
        severity: 'attention'
      });
    });

    // Post creation events
    recentPosts.forEach(post => {
      activities.push({
        id: `post_${post._id}`,
        type: 'post_created',
        title: 'New Post Published',
        description: (post.content || '').slice(0, 80) + '...',
        timestamp: post.createdAt,
        actor: post.user?.username || 'Developer',
        severity: 'default'
      });
    });

    // User registrations
    recentUsers.forEach(usr => {
      activities.push({
        id: `user_${usr._id}`,
        type: 'user_registered',
        title: 'New User Registered',
        description: `@${usr.username} (${usr.role})`,
        timestamp: usr.createdAt,
        actor: usr.name || usr.username,
        severity: 'success'
      });
    });

    // Sort combined timeline descending
    activities.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    res.status(200).json({
      success: true,
      activities: activities.slice(0, limit)
    });
  } catch (err) {
    next(err);
  }
};
