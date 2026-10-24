const User = require('../../models/user');
const Post = require('../../models/post');
const Reply = require('../../models/reply');
const Project = require('../../models/project');
const BuildLog = require('../../models/buildLog');
const Report = require('../../models/report');
const AuditLog = require('../../models/auditLog');
const Repost = require('../../models/repost');
const Follow = require('../../models/follow');
const Digest = require('../../models/digest');

/**
 * Helper to determine date threshold and date-string grouping format
 */
const getRangeFilter = (range = '30d') => {
  const now = new Date();
  let days = 30;
  let dateFormat = '%Y-%m-%d';

  if (range === '7d') {
    days = 7;
  } else if (range === '90d') {
    days = 90;
  } else if (range === '12m') {
    days = 365;
    dateFormat = '%Y-%m';
  }

  const startDate = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
  return { startDate, dateFormat, days };
};

/**
 * @desc    Community Growth (New users and cumulative total over time)
 * @route   GET /api/admin/analytics/community
 * @access  Private (Admin)
 */
exports.getCommunityGrowth = async (req, res, next) => {
  try {
    const { range = '30d' } = req.query;
    const { startDate, dateFormat } = getRangeFilter(range);

    const [dailySignups, totalBeforeStart] = await Promise.all([
      User.aggregate([
        { $match: { createdAt: { $gte: startDate } } },
        {
          $group: {
            _id: { $dateToString: { format: dateFormat, date: '$createdAt' } },
            newUsers: { $sum: 1 }
          }
        },
        { $sort: { _id: 1 } }
      ]),
      User.countDocuments({ createdAt: { $lt: startDate } })
    ]);

    let runningTotal = totalBeforeStart;
    const series = dailySignups.map(item => {
      runningTotal += item.newUsers;
      return {
        date: item._id,
        newUsers: item.newUsers,
        cumulativeUsers: runningTotal
      };
    });

    res.status(200).json({
      success: true,
      range,
      series
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Content Creation trends (Posts, Replies, Projects, Build Logs over time)
 * @route   GET /api/admin/analytics/content
 * @access  Private (Admin)
 */
exports.getContentCreation = async (req, res, next) => {
  try {
    const { range = '30d' } = req.query;
    const { startDate, dateFormat } = getRangeFilter(range);

    const [postsAgg, repliesAgg, projectsAgg, logsAgg] = await Promise.all([
      Post.aggregate([
        { $match: { createdAt: { $gte: startDate } } },
        { $group: { _id: { $dateToString: { format: dateFormat, date: '$createdAt' } }, count: { $sum: 1 } } },
        { $sort: { _id: 1 } }
      ]),
      Reply.aggregate([
        { $match: { createdAt: { $gte: startDate } } },
        { $group: { _id: { $dateToString: { format: dateFormat, date: '$createdAt' } }, count: { $sum: 1 } } },
        { $sort: { _id: 1 } }
      ]),
      Project.aggregate([
        { $match: { createdAt: { $gte: startDate } } },
        { $group: { _id: { $dateToString: { format: dateFormat, date: '$createdAt' } }, count: { $sum: 1 } } },
        { $sort: { _id: 1 } }
      ]),
      BuildLog.aggregate([
        { $match: { createdAt: { $gte: startDate } } },
        { $group: { _id: { $dateToString: { format: dateFormat, date: '$createdAt' } }, count: { $sum: 1 } } },
        { $sort: { _id: 1 } }
      ])
    ]);

    // Map all unique dates
    const dateMap = new Map();
    const addAgg = (agg, key) => {
      agg.forEach(item => {
        if (!dateMap.has(item._id)) {
          dateMap.set(item._id, { date: item._id, posts: 0, replies: 0, projects: 0, buildLogs: 0 });
        }
        dateMap.get(item._id)[key] = item.count;
      });
    };

    addAgg(postsAgg, 'posts');
    addAgg(repliesAgg, 'replies');
    addAgg(projectsAgg, 'projects');
    addAgg(logsAgg, 'buildLogs');

    const series = Array.from(dateMap.values()).sort((a, b) => a.date.localeCompare(b.date));

    // Distribution totals
    const [totalPosts, totalReplies, totalProjects, totalLogs] = await Promise.all([
      Post.countDocuments({}),
      Reply.countDocuments({}),
      Project.countDocuments({}),
      BuildLog.countDocuments({})
    ]);

    const distribution = [
      { name: 'Posts', value: totalPosts },
      { name: 'Replies', value: totalReplies },
      { name: 'Projects', value: totalProjects },
      { name: 'Build Logs', value: totalLogs }
    ];

    res.status(200).json({
      success: true,
      range,
      series,
      distribution
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Engagement trends and distribution (Likes, Replies, Reposts, Quotes)
 * @route   GET /api/admin/analytics/engagement
 * @access  Private (Admin)
 */
exports.getEngagementAnalytics = async (req, res, next) => {
  try {
    const { range = '30d' } = req.query;
    const { startDate, dateFormat } = getRangeFilter(range);

    const [repliesAgg, repostsAgg, quotePostsAgg, totalLikesAgg, totalReplies, totalReposts, totalQuotes] = await Promise.all([
      Reply.aggregate([
        { $match: { createdAt: { $gte: startDate } } },
        { $group: { _id: { $dateToString: { format: dateFormat, date: '$createdAt' } }, replies: { $sum: 1 } } },
        { $sort: { _id: 1 } }
      ]),
      Repost.aggregate([
        { $match: { createdAt: { $gte: startDate } } },
        { $group: { _id: { $dateToString: { format: dateFormat, date: '$createdAt' } }, reposts: { $sum: 1 } } },
        { $sort: { _id: 1 } }
      ]),
      Post.aggregate([
        { $match: { createdAt: { $gte: startDate }, quotedPost: { $ne: null } } },
        { $group: { _id: { $dateToString: { format: dateFormat, date: '$createdAt' } }, quotes: { $sum: 1 } } },
        { $sort: { _id: 1 } }
      ]),
      Post.aggregate([
        { $project: { likeCount: { $size: { $ifNull: ['$likes', []] } } } },
        { $group: { _id: null, total: { $sum: '$likeCount' } } }
      ]),
      Reply.countDocuments({}),
      Repost.countDocuments({}),
      Post.countDocuments({ quotedPost: { $ne: null } })
    ]);

    const totalLikes = (totalLikesAgg[0] && totalLikesAgg[0].total) || 0;

    const dateMap = new Map();
    repliesAgg.forEach(r => {
      dateMap.set(r._id, { date: r._id, replies: r.replies, reposts: 0, quotes: 0 });
    });
    repostsAgg.forEach(rp => {
      if (!dateMap.has(rp._id)) dateMap.set(rp._id, { date: rp._id, replies: 0, reposts: 0, quotes: 0 });
      dateMap.get(rp._id).reposts = rp.reposts;
    });
    quotePostsAgg.forEach(qp => {
      if (!dateMap.has(qp._id)) dateMap.set(qp._id, { date: qp._id, replies: 0, reposts: 0, quotes: 0 });
      dateMap.get(qp._id).quotes = qp.quotes;
    });

    const series = Array.from(dateMap.values()).sort((a, b) => a.date.localeCompare(b.date));

    const distribution = [
      { name: 'Likes', value: totalLikes },
      { name: 'Replies', value: totalReplies },
      { name: 'Reposts', value: totalReposts },
      { name: 'Quote Posts', value: totalQuotes }
    ];

    res.status(200).json({
      success: true,
      range,
      series,
      distribution
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Moderation analytics (Reports by status, reason, actions over time)
 * @route   GET /api/admin/analytics/moderation
 * @access  Private (Admin)
 */
exports.getModerationAnalytics = async (req, res, next) => {
  try {
    const { range = '30d' } = req.query;
    const { startDate, dateFormat } = getRangeFilter(range);

    const [byStatus, byReason, reportsOverTime, actionsOverTime] = await Promise.all([
      Report.aggregate([
        { $group: { _id: '$status', count: { $sum: 1 } } }
      ]),
      Report.aggregate([
        { $group: { _id: '$reason', count: { $sum: 1 } } },
        { $sort: { count: -1 } }
      ]),
      Report.aggregate([
        { $match: { createdAt: { $gte: startDate } } },
        { $group: { _id: { $dateToString: { format: dateFormat, date: '$createdAt' } }, reports: { $sum: 1 } } },
        { $sort: { _id: 1 } }
      ]),
      AuditLog.aggregate([
        { $match: { createdAt: { $gte: startDate } } },
        { $group: { _id: { $dateToString: { format: dateFormat, date: '$createdAt' } }, actions: { $sum: 1 } } },
        { $sort: { _id: 1 } }
      ])
    ]);

    const dateMap = new Map();
    reportsOverTime.forEach(r => {
      dateMap.set(r._id, { date: r._id, reports: r.reports, actions: 0 });
    });
    actionsOverTime.forEach(a => {
      if (!dateMap.has(a._id)) dateMap.set(a._id, { date: a._id, reports: 0, actions: 0 });
      dateMap.get(a._id).actions = a.actions;
    });

    const series = Array.from(dateMap.values()).sort((a, b) => a.date.localeCompare(b.date));

    res.status(200).json({
      success: true,
      byStatus: byStatus.map(s => ({ name: s._id, value: s.count })),
      byReason: byReason.map(r => ({ name: r._id, value: r.count })),
      series
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Top performing posts based on engagement score
 * @route   GET /api/admin/analytics/top-posts
 * @access  Private (Admin)
 */
exports.getTopPosts = async (req, res, next) => {
  try {
    const limit = Math.min(50, Math.max(5, parseInt(req.query.limit, 10) || 10));

    const posts = await Post.find()
      .populate('user', 'username name Profilepic')
      .lean();

    // Compute metrics for each post
    const postIds = posts.map(p => p._id);
    const [replyCounts, repostCounts] = await Promise.all([
      Reply.aggregate([
        { $match: { post: { $in: postIds } } },
        { $group: { _id: '$post', count: { $sum: 1 } } }
      ]),
      Repost.aggregate([
        { $match: { post: { $in: postIds } } },
        { $group: { _id: '$post', count: { $sum: 1 } } }
      ])
    ]);

    const replyMap = new Map(replyCounts.map(r => [r._id.toString(), r.count]));
    const repostMap = new Map(repostCounts.map(r => [r._id.toString(), r.count]));

    const enriched = posts.map(post => {
      const likesCount = Array.isArray(post.likes) ? post.likes.length : 0;
      const repliesCount = replyMap.get(post._id.toString()) || 0;
      const repostsCount = repostMap.get(post._id.toString()) || 0;
      // Formula: Engagement Score = (likes * 2) + (replies * 3) + (reposts * 4)
      const engagementScore = (likesCount * 2) + (repliesCount * 3) + (repostsCount * 4);

      return {
        _id: post._id,
        content: (post.content || '').slice(0, 120),
        author: post.user ? {
          _id: post.user._id,
          username: post.user.username,
          name: post.user.name,
          Profilepic: post.user.Profilepic
        } : null,
        likesCount,
        repliesCount,
        repostsCount,
        engagementScore,
        isHidden: post.isHidden || false,
        createdAt: post.createdAt
      };
    });

    enriched.sort((a, b) => b.engagementScore - a.engagementScore);

    res.status(200).json({
      success: true,
      posts: enriched.slice(0, limit)
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Top developers ranking based on activity and contributions
 * @route   GET /api/admin/analytics/top-developers
 * @access  Private (Admin)
 */
exports.getTopDevelopers = async (req, res, next) => {
  try {
    const limit = Math.min(50, Math.max(5, parseInt(req.query.limit, 10) || 10));

    const [postCounts, projectCounts] = await Promise.all([
      Post.aggregate([
        { $group: { _id: '$user', postsCount: { $sum: 1 } } },
        { $sort: { postsCount: -1 } },
        { $limit: limit * 2 }
      ]),
      Project.aggregate([
        { $group: { _id: '$owner', projectsCount: { $sum: 1 } } }
      ])
    ]);

    const projectMap = new Map(projectCounts.map(p => [p._id.toString(), p.projectsCount]));
    const userIds = postCounts.map(p => p._id).filter(Boolean);

    const users = await User.find({ _id: { $in: userIds } })
      .select('username name Profilepic role createdAt')
      .lean();

    const userMap = new Map(users.map(u => [u._id.toString(), u]));

    const developers = postCounts.map(item => {
      if (!item._id) return null;
      const u = userMap.get(item._id.toString());
      if (!u) return null;
      const postsCount = item.postsCount;
      const projectsCount = projectMap.get(item._id.toString()) || 0;
      const score = (postsCount * 3) + (projectsCount * 5);

      return {
        user: u,
        postsCount,
        projectsCount,
        score
      };
    }).filter(Boolean);

    developers.sort((a, b) => b.score - a.score);

    res.status(200).json({
      success: true,
      developers: developers.slice(0, limit)
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Hashtag analytics across posts
 * @route   GET /api/admin/analytics/hashtags
 * @access  Private (Admin)
 */
exports.getHashtagAnalytics = async (req, res, next) => {
  try {
    const tags = await Post.aggregate([
      { $unwind: '$tags' },
      { $group: { _id: '$tags', count: { $sum: 1 }, latestPost: { $max: '$createdAt' } } },
      { $sort: { count: -1 } },
      { $limit: 30 }
    ]);

    res.status(200).json({
      success: true,
      hashtags: tags.map(t => ({
        tag: t._id,
        count: t.count,
        latestPost: t.latestPost
      }))
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Project Analytics (Visibility, build logs, and status breakdown)
 * @route   GET /api/admin/analytics/projects
 * @access  Private (Admin)
 */
exports.getProjectAnalytics = async (req, res, next) => {
  try {
    const [visibilityCounts, statusCounts, totalProjects, totalBuildLogs] = await Promise.all([
      Project.aggregate([
        { $group: { _id: '$visibility', count: { $sum: 1 } } }
      ]),
      Project.aggregate([
        { $group: { _id: '$status', count: { $sum: 1 } } }
      ]),
      Project.countDocuments({}),
      BuildLog.countDocuments({})
    ]);

    res.status(200).json({
      success: true,
      totalProjects,
      totalBuildLogs,
      visibility: visibilityCounts.map(v => ({ name: v._id, value: v.count })),
      status: statusCounts.map(s => ({ name: s._id, value: s.count }))
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Digest and Email Delivery Analytics
 * @route   GET /api/admin/analytics/digest
 * @access  Private (Admin)
 */
exports.getDigestAnalytics = async (req, res, next) => {
  try {
    const [deliveryStatusCounts, totalDigests, latestDigests] = await Promise.all([
      Digest.aggregate([
        { $group: { _id: '$deliveryStatus', count: { $sum: 1 } } }
      ]),
      Digest.countDocuments({}),
      Digest.find()
        .sort({ createdAt: -1 })
        .limit(10)
        .populate('user', 'username name email')
        .select('periodKey deliveryStatus deliveryAttempts isAmbiguousTimeout createdAt user')
        .lean()
    ]);

    res.status(200).json({
      success: true,
      totalDigests,
      deliveryBreakdown: deliveryStatusCounts.map(d => ({ name: d._id || 'unknown', value: d.count })),
      recentRuns: latestDigests
    });
  } catch (err) {
    next(err);
  }
};
