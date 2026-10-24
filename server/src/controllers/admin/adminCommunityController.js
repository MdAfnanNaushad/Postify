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

// @desc    Get paginated users with filters and search
// @route   GET /api/admin/users
// @access  Private (Admin)
exports.getUsers = async (req, res, next) => {
  try {
    const { page = 1, limit = 20, role = 'all', status = 'all', search = '', sort = 'createdAt_desc' } = req.query;

    const query = {};

    if (role && role !== 'all') {
      query.role = role;
    }

    if (status === 'suspended') {
      query.isSuspended = true;
    } else if (status === 'active') {
      query.isSuspended = { $ne: true };
    }

    if (search && search.trim()) {
      const cleanSearch = search.trim();
      query.$or = [
        { username: { $regex: cleanSearch, $options: 'i' } },
        { name: { $regex: cleanSearch, $options: 'i' } },
        { email: { $regex: cleanSearch, $options: 'i' } }
      ];
    }

    let sortObj = { createdAt: -1 };
    if (sort === 'createdAt_asc') sortObj = { createdAt: 1 };
    if (sort === 'username_asc') sortObj = { username: 1 };
    if (sort === 'username_desc') sortObj = { username: -1 };

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
    const skip = (pageNum - 1) * limitNum;

    const [total, users] = await Promise.all([
      User.countDocuments(query),
      User.find(query)
        .select('-password')
        .sort(sortObj)
        .skip(skip)
        .limit(limitNum)
        .lean()
    ]);

    res.status(200).json({
      success: true,
      users,
      total,
      page: pageNum,
      pages: Math.ceil(total / limitNum)
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Get complete administrative user detail
// @route   GET /api/admin/users/:id
// @access  Private (Admin)
exports.getUserById = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ success: false, message: 'Invalid user ID format.' });
    }

    const user = await User.findById(id).select('-password').lean();
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    const [postsCount, projectsCount, reportsCount, auditHistory] = await Promise.all([
      Post.countDocuments({ user: user._id }),
      Project.countDocuments({ owner: user._id }),
      Report.countDocuments({ targetType: 'user', targetId: user._id }),
      AuditLog.find({ targetType: 'user', targetId: user._id })
        .sort({ createdAt: -1 })
        .populate('actor', 'username name')
        .limit(10)
        .lean()
    ]);

    res.status(200).json({
      success: true,
      user,
      stats: {
        postsCount,
        projectsCount,
        reportsCount
      },
      auditHistory
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Suspend or reinstate user
// @route   PATCH /api/admin/users/:id/suspend
// @access  Private (Admin)
exports.updateUserSuspension = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { isSuspended, reason } = req.body;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ success: false, message: 'Invalid user ID format.' });
    }

    // Safety: prevent self-suspension
    if (id === req.user._id.toString()) {
      return res.status(400).json({
        success: false,
        message: 'Security protection: You cannot suspend your own administrative account.'
      });
    }

    const targetUser = await User.findById(id);
    if (!targetUser) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    const shouldSuspend = Boolean(isSuspended);
    const cleanReason = String(reason || '').trim().slice(0, 1000);

    if (shouldSuspend && !cleanReason) {
      return res.status(400).json({
        success: false,
        message: 'A clear reason is required to suspend an account.'
      });
    }

    targetUser.isSuspended = shouldSuspend;
    targetUser.suspendedReason = shouldSuspend ? cleanReason : '';
    targetUser.suspendedAt = shouldSuspend ? new Date() : null;
    await targetUser.save();

    // Create audit log
    await AuditLog.create({
      actor: req.user._id,
      action: shouldSuspend ? 'suspend_user' : 'unsuspend_user',
      targetType: 'user',
      targetId: targetUser._id,
      reason: cleanReason,
      details: {
        previousState: !shouldSuspend,
        newState: shouldSuspend
      }
    });

    res.status(200).json({
      success: true,
      message: `User @${targetUser.username} has been ${shouldSuspend ? 'suspended' : 'reinstated'}.`,
      user: {
        _id: targetUser._id,
        username: targetUser.username,
        isSuspended: targetUser.isSuspended,
        suspendedReason: targetUser.suspendedReason,
        suspendedAt: targetUser.suspendedAt
      }
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Change user role (user, moderator, admin)
// @route   PATCH /api/admin/users/:id/role
// @access  Private (Admin)
exports.updateUserRole = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { role, reason } = req.body;

    const VALID_ROLES = ['user', 'moderator', 'admin'];
    if (!role || !VALID_ROLES.includes(role)) {
      return res.status(400).json({
        success: false,
        message: `Invalid role. Allowed roles are: ${VALID_ROLES.join(', ')}`
      });
    }

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ success: false, message: 'Invalid user ID format.' });
    }

    // Safety: prevent self-demotion
    if (id === req.user._id.toString() && role !== 'admin') {
      return res.status(400).json({
        success: false,
        message: 'Security protection: You cannot demote your own administrator account.'
      });
    }

    const targetUser = await User.findById(id);
    if (!targetUser) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    // If demoting an admin, ensure another active admin remains
    if (targetUser.role === 'admin' && role !== 'admin') {
      const activeAdminCount = await User.countDocuments({
        role: 'admin',
        isSuspended: { $ne: true },
        _id: { $ne: targetUser._id }
      });

      if (activeAdminCount === 0) {
        return res.status(400).json({
          success: false,
          message: 'Security protection: Cannot demote the last remaining active administrator.'
        });
      }
    }

    const previousRole = targetUser.role;
    targetUser.role = role;
    await targetUser.save();

    await AuditLog.create({
      actor: req.user._id,
      action: 'assign_role',
      targetType: 'user',
      targetId: targetUser._id,
      reason: String(reason || 'Role updated via Admin Control Center').trim().slice(0, 1000),
      details: {
        previousRole,
        newRole: role
      }
    });

    res.status(200).json({
      success: true,
      message: `Role for @${targetUser.username} updated from ${previousRole} to ${role}.`,
      user: {
        _id: targetUser._id,
        username: targetUser.username,
        role: targetUser.role
      }
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Assign or update user badges explicitly
// @route   PATCH /api/admin/users/:id/badge
// @access  Private (Admin)
exports.updateUserBadge = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { isVerified, badge, badgeTitle, reason } = req.body;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ success: false, message: 'Invalid user ID format.' });
    }

    const targetUser = await User.findById(id);
    if (!targetUser) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    const prevBadgeState = {
      isVerified: Boolean(targetUser.isVerified),
      badge: targetUser.badge || '',
      badgeTitle: targetUser.badgeTitle || ''
    };

    if (isVerified !== undefined) {
      targetUser.isVerified = Boolean(isVerified);
    }
    if (badge !== undefined || badgeTitle !== undefined) {
      const assignedBadge = String(badge || badgeTitle || '').trim().slice(0, 50);
      targetUser.badge = assignedBadge;
      targetUser.badgeTitle = assignedBadge;
    }

    await targetUser.save();

    await AuditLog.create({
      actor: req.user._id,
      action: 'grant_badge',
      targetType: 'user',
      targetId: targetUser._id,
      reason: String(reason || 'Manual badge assignment via Admin Control Center').trim().slice(0, 500),
      details: {
        previousState: prevBadgeState,
        newState: {
          isVerified: targetUser.isVerified,
          badge: targetUser.badge,
          badgeTitle: targetUser.badgeTitle
        }
      }
    });

    res.status(200).json({
      success: true,
      message: `Badges for @${targetUser.username} updated successfully.`,
      user: {
        _id: targetUser._id,
        username: targetUser.username,
        isVerified: targetUser.isVerified,
        badge: targetUser.badge,
        badgeTitle: targetUser.badgeTitle
      }
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Get paginated posts for content moderation
// @route   GET /api/admin/posts
// @access  Private (Admin)
exports.getPosts = async (req, res, next) => {
  try {
    const { page = 1, limit = 20, hidden = 'all', search = '' } = req.query;
    const query = {};

    if (hidden === 'hidden') query.isHidden = true;
    if (hidden === 'visible') query.isHidden = { $ne: true };

    if (search && search.trim()) {
      query.content = { $regex: search.trim(), $options: 'i' };
    }

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
    const skip = (pageNum - 1) * limitNum;

    const [total, posts] = await Promise.all([
      Post.countDocuments(query),
      Post.find(query)
        .populate('user', 'username name Profilepic role')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .lean()
    ]);

    // Attach reply and repost counts
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

    const enriched = posts.map(p => ({
      ...p,
      likeCount: Array.isArray(p.likes) ? p.likes.length : 0,
      replyCount: replyMap.get(p._id.toString()) || 0,
      repostCount: repostMap.get(p._id.toString()) || 0
    }));

    res.status(200).json({
      success: true,
      posts: enriched,
      total,
      page: pageNum,
      pages: Math.ceil(total / limitNum)
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Toggle post soft-hiding
// @route   PATCH /api/admin/posts/:id/visibility
// @access  Private (Admin)
exports.updatePostVisibility = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { isHidden, reason } = req.body;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ success: false, message: 'Invalid post ID format.' });
    }

    const post = await Post.findById(id);
    if (!post) {
      return res.status(404).json({ success: false, message: 'Post not found.' });
    }

    const shouldHide = Boolean(isHidden);
    const cleanReason = String(reason || '').trim().slice(0, 1000);

    post.isHidden = shouldHide;
    post.moderationReason = shouldHide ? cleanReason : '';
    await post.save();

    await AuditLog.create({
      actor: req.user._id,
      action: shouldHide ? 'hide_content' : 'restore_content',
      targetType: 'post',
      targetId: post._id,
      reason: cleanReason,
      details: { isHidden: shouldHide }
    });

    res.status(200).json({
      success: true,
      message: `Post visibility updated to ${shouldHide ? 'hidden' : 'visible'}.`,
      post
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Get paginated replies for moderation
// @route   GET /api/admin/replies
// @access  Private (Admin)
exports.getReplies = async (req, res, next) => {
  try {
    const { page = 1, limit = 20, hidden = 'all', search = '' } = req.query;
    const query = {};

    if (hidden === 'hidden') query.isHidden = true;
    if (hidden === 'visible') query.isHidden = { $ne: true };

    if (search && search.trim()) {
      query.content = { $regex: search.trim(), $options: 'i' };
    }

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
    const skip = (pageNum - 1) * limitNum;

    const [total, replies] = await Promise.all([
      Reply.countDocuments(query),
      Reply.find(query)
        .populate('user', 'username name Profilepic')
        .populate('post', 'content user')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .lean()
    ]);

    res.status(200).json({
      success: true,
      replies,
      total,
      page: pageNum,
      pages: Math.ceil(total / limitNum)
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Toggle reply soft-hiding
// @route   PATCH /api/admin/replies/:id/visibility
// @access  Private (Admin)
exports.updateReplyVisibility = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { isHidden, reason } = req.body;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ success: false, message: 'Invalid reply ID format.' });
    }

    const reply = await Reply.findById(id);
    if (!reply) {
      return res.status(404).json({ success: false, message: 'Reply not found.' });
    }

    const shouldHide = Boolean(isHidden);
    const cleanReason = String(reason || '').trim().slice(0, 1000);

    reply.isHidden = shouldHide;
    reply.moderationReason = shouldHide ? cleanReason : '';
    await reply.save();

    await AuditLog.create({
      actor: req.user._id,
      action: shouldHide ? 'hide_content' : 'restore_content',
      targetType: 'reply',
      targetId: reply._id,
      reason: cleanReason,
      details: { isHidden: shouldHide }
    });

    res.status(200).json({
      success: true,
      message: `Reply visibility updated to ${shouldHide ? 'hidden' : 'visible'}.`,
      reply
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Get paginated projects
// @route   GET /api/admin/projects
// @access  Private (Admin)
exports.getProjects = async (req, res, next) => {
  try {
    const { page = 1, limit = 20, visibility = 'all', hidden = 'all', search = '' } = req.query;
    const query = {};

    if (visibility && visibility !== 'all') query.visibility = visibility;
    if (hidden === 'hidden') query.isHidden = true;
    if (hidden === 'visible') query.isHidden = { $ne: true };

    if (search && search.trim()) {
      query.$or = [
        { name: { $regex: search.trim(), $options: 'i' } },
        { shortDescription: { $regex: search.trim(), $options: 'i' } }
      ];
    }

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
    const skip = (pageNum - 1) * limitNum;

    const [total, projects] = await Promise.all([
      Project.countDocuments(query),
      Project.find(query)
        .populate('owner', 'username name Profilepic')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .lean()
    ]);

    // Attach build log counts
    const projectIds = projects.map(p => p._id);
    const logCounts = await BuildLog.aggregate([
      { $match: { project: { $in: projectIds } } },
      { $group: { _id: '$project', count: { $sum: 1 } } }
    ]);
    const logMap = new Map(logCounts.map(l => [l._id.toString(), l.count]));

    const enriched = projects.map(p => ({
      ...p,
      buildLogCount: logMap.get(p._id.toString()) || 0
    }));

    res.status(200).json({
      success: true,
      projects: enriched,
      total,
      page: pageNum,
      pages: Math.ceil(total / limitNum)
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Toggle project soft-hiding
// @route   PATCH /api/admin/projects/:id/visibility
// @access  Private (Admin)
exports.updateProjectVisibility = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { isHidden, reason } = req.body;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ success: false, message: 'Invalid project ID format.' });
    }

    const project = await Project.findById(id);
    if (!project) {
      return res.status(404).json({ success: false, message: 'Project not found.' });
    }

    const shouldHide = Boolean(isHidden);
    const cleanReason = String(reason || '').trim().slice(0, 1000);

    project.isHidden = shouldHide;
    project.moderationReason = shouldHide ? cleanReason : '';
    await project.save();

    await AuditLog.create({
      actor: req.user._id,
      action: shouldHide ? 'hide_content' : 'restore_content',
      targetType: 'project',
      targetId: project._id,
      reason: cleanReason,
      details: { isHidden: shouldHide }
    });

    res.status(200).json({
      success: true,
      message: `Project visibility updated to ${shouldHide ? 'hidden' : 'visible'}.`,
      project
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Get paginated build logs
// @route   GET /api/admin/build-logs
// @access  Private (Admin)
exports.getBuildLogs = async (req, res, next) => {
  try {
    const { page = 1, limit = 20, hidden = 'all', search = '' } = req.query;
    const query = {};

    if (hidden === 'hidden') query.isHidden = true;
    if (hidden === 'visible') query.isHidden = { $ne: true };

    if (search && search.trim()) {
      query.title = { $regex: search.trim(), $options: 'i' };
    }

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
    const skip = (pageNum - 1) * limitNum;

    const [total, buildLogs] = await Promise.all([
      BuildLog.countDocuments(query),
      BuildLog.find(query)
        .populate('author', 'username name Profilepic')
        .populate('project', 'name slug owner')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .lean()
    ]);

    res.status(200).json({
      success: true,
      buildLogs,
      total,
      page: pageNum,
      pages: Math.ceil(total / limitNum)
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Toggle build log soft-hiding
// @route   PATCH /api/admin/build-logs/:id/visibility
// @access  Private (Admin)
exports.updateBuildLogVisibility = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { isHidden, reason } = req.body;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ success: false, message: 'Invalid build log ID format.' });
    }

    const buildLog = await BuildLog.findById(id);
    if (!buildLog) {
      return res.status(404).json({ success: false, message: 'Build log not found.' });
    }

    const shouldHide = Boolean(isHidden);
    const cleanReason = String(reason || '').trim().slice(0, 1000);

    buildLog.isHidden = shouldHide;
    buildLog.moderationReason = shouldHide ? cleanReason : '';
    await buildLog.save();

    await AuditLog.create({
      actor: req.user._id,
      action: shouldHide ? 'hide_content' : 'restore_content',
      targetType: 'buildLog',
      targetId: buildLog._id,
      reason: cleanReason,
      details: { isHidden: shouldHide }
    });

    res.status(200).json({
      success: true,
      message: `Build log visibility updated to ${shouldHide ? 'hidden' : 'visible'}.`,
      buildLog
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Get follow graph metrics & community growth
// @route   GET /api/admin/follows
// @access  Private (Admin)
exports.getFollowMetrics = async (req, res, next) => {
  try {
    const [totalFollows, topFollowed] = await Promise.all([
      Follow.countDocuments({}),
      Follow.aggregate([
        { $group: { _id: '$following', followersCount: { $sum: 1 } } },
        { $sort: { followersCount: -1 } },
        { $limit: 10 }
      ])
    ]);

    const userIds = topFollowed.map(t => t._id);
    const users = await User.find({ _id: { $in: userIds } })
      .select('username name Profilepic role')
      .lean();
    const userMap = new Map(users.map(u => [u._id.toString(), u]));

    const leaders = topFollowed.map(t => ({
      user: userMap.get(t._id.toString()),
      followersCount: t.followersCount
    })).filter(l => l.user);

    res.status(200).json({
      success: true,
      totalFollows,
      topFollowed: leaders
    });
  } catch (err) {
    next(err);
  }
};
