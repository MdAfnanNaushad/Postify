const mongoose = require('mongoose');
const Report = require('../../models/report');
const AuditLog = require('../../models/auditLog');
const User = require('../../models/user');
const Post = require('../../models/post');
const Reply = require('../../models/reply');
const Project = require('../../models/project');
const BuildLog = require('../../models/buildLog');

// @desc    Get moderation reports with filtering & pagination
// @route   GET /api/admin/reports
// @access  Private (Admin)
exports.getReports = async (req, res, next) => {
  try {
    const { status = 'all', targetType, reason, page = 1, limit = 20 } = req.query;
    const filter = {};

    if (status && status !== 'all') {
      filter.status = status;
    }

    if (targetType && ['post', 'reply', 'project', 'buildLog', 'user'].includes(targetType)) {
      filter.targetType = targetType;
    }

    if (reason && ['spam', 'harassment', 'hate_speech', 'inappropriate', 'copyright', 'other'].includes(reason)) {
      filter.reason = reason;
    }

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
    const skip = (pageNum - 1) * limitNum;

    const [total, reports] = await Promise.all([
      Report.countDocuments(filter),
      Report.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .populate('reporter', 'username name email Profilepic')
        .populate('resolvedBy', 'username name')
        .lean()
    ]);

    res.status(200).json({
      success: true,
      reports,
      total,
      page: pageNum,
      pages: Math.ceil(total / limitNum)
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Get single report details with resolved target content
// @route   GET /api/admin/reports/:id
// @access  Private (Admin)
exports.getReportById = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ success: false, message: 'Invalid report ID format.' });
    }

    const report = await Report.findById(id)
      .populate('reporter', 'username name email Profilepic')
      .populate('resolvedBy', 'username name')
      .lean();

    if (!report) {
      return res.status(404).json({ success: false, message: 'Report not found.' });
    }

    // Resolve target content
    let targetContent = null;
    if (report.targetType === 'post') {
      targetContent = await Post.findById(report.targetId).populate('user', 'username name Profilepic');
    } else if (report.targetType === 'reply') {
      targetContent = await Reply.findById(report.targetId).populate('user', 'username name Profilepic');
    } else if (report.targetType === 'project') {
      targetContent = await Project.findById(report.targetId).populate('owner', 'username name Profilepic');
    } else if (report.targetType === 'buildLog') {
      targetContent = await BuildLog.findById(report.targetId).populate('author', 'username name Profilepic');
    } else if (report.targetType === 'user') {
      targetContent = await User.findById(report.targetId).select('-password');
    }

    res.status(200).json({
      success: true,
      report,
      targetContent
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Take moderation action on a report
// @route   PATCH /api/admin/reports/:id/action
// @access  Private (Admin)
exports.actionReport = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { action, notes } = req.body;

    const VALID_ACTIONS = ['hide_content', 'restore_content', 'suspend_user', 'unsuspend_user', 'dismiss'];
    if (!action || !VALID_ACTIONS.includes(action)) {
      return res.status(400).json({
        success: false,
        message: `Invalid action. Must be one of: ${VALID_ACTIONS.join(', ')}`
      });
    }

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ success: false, message: 'Invalid report ID format.' });
    }

    const report = await Report.findById(id);
    if (!report) {
      return res.status(404).json({ success: false, message: 'Report not found.' });
    }

    const cleanNotes = String(notes || '').trim().slice(0, 1000);

    // Execute enforcement actions
    if (action === 'hide_content') {
      if (report.targetType === 'post') {
        await Post.findByIdAndUpdate(report.targetId, { isHidden: true, moderationReason: cleanNotes });
      } else if (report.targetType === 'reply') {
        await Reply.findByIdAndUpdate(report.targetId, { isHidden: true, moderationReason: cleanNotes });
      } else if (report.targetType === 'project') {
        await Project.findByIdAndUpdate(report.targetId, { isHidden: true, moderationReason: cleanNotes });
      } else if (report.targetType === 'buildLog') {
        await BuildLog.findByIdAndUpdate(report.targetId, { isHidden: true, moderationReason: cleanNotes });
      } else if (report.targetType === 'user') {
        return res.status(400).json({
          success: false,
          message: 'Cannot hide a user profile. Use suspend_user action instead.'
        });
      }
      report.status = 'actioned';
      report.actionTaken = 'content_hidden';
    } else if (action === 'restore_content') {
      if (report.targetType === 'post') {
        await Post.findByIdAndUpdate(report.targetId, { isHidden: false, moderationReason: '' });
      } else if (report.targetType === 'reply') {
        await Reply.findByIdAndUpdate(report.targetId, { isHidden: false, moderationReason: '' });
      } else if (report.targetType === 'project') {
        await Project.findByIdAndUpdate(report.targetId, { isHidden: false, moderationReason: '' });
      } else if (report.targetType === 'buildLog') {
        await BuildLog.findByIdAndUpdate(report.targetId, { isHidden: false, moderationReason: '' });
      }
      report.status = 'actioned';
      report.actionTaken = 'content_restored';
    } else if (action === 'suspend_user') {
      let targetUserId = report.targetId;
      if (report.targetType !== 'user') {
        if (report.targetType === 'post') {
          const doc = await Post.findById(report.targetId);
          if (doc) targetUserId = doc.user;
        } else if (report.targetType === 'reply') {
          const doc = await Reply.findById(report.targetId);
          if (doc) targetUserId = doc.user;
        } else if (report.targetType === 'project') {
          const doc = await Project.findById(report.targetId);
          if (doc) targetUserId = doc.owner;
        } else if (report.targetType === 'buildLog') {
          const doc = await BuildLog.findById(report.targetId);
          if (doc) targetUserId = doc.author;
        }
      }

      await User.findByIdAndUpdate(targetUserId, {
        isSuspended: true,
        suspendedReason: cleanNotes || 'Violated community guidelines',
        suspendedAt: new Date()
      });
      report.status = 'actioned';
      report.actionTaken = 'user_suspended';
    } else if (action === 'unsuspend_user') {
      let targetUserId = report.targetId;
      if (report.targetType !== 'user') {
        if (report.targetType === 'post') {
          const doc = await Post.findById(report.targetId);
          if (doc) targetUserId = doc.user;
        } else if (report.targetType === 'reply') {
          const doc = await Reply.findById(report.targetId);
          if (doc) targetUserId = doc.user;
        } else if (report.targetType === 'project') {
          const doc = await Project.findById(report.targetId);
          if (doc) targetUserId = doc.owner;
        } else if (report.targetType === 'buildLog') {
          const doc = await BuildLog.findById(report.targetId);
          if (doc) targetUserId = doc.author;
        }
      }

      await User.findByIdAndUpdate(targetUserId, {
        isSuspended: false,
        suspendedReason: '',
        suspendedAt: null
      });
      report.status = 'actioned';
      report.actionTaken = 'user_unsuspended';
    } else if (action === 'dismiss') {
      report.status = 'dismissed';
      report.actionTaken = 'dismissed';
    }

    report.moderatorNotes = cleanNotes;
    report.resolvedBy = req.user._id;
    report.resolvedAt = new Date();
    await report.save();

    await AuditLog.create({
      actor: req.user._id,
      action: action === 'dismiss' ? 'dismiss_report' : action,
      targetType: report.targetType,
      targetId: report.targetId,
      reason: cleanNotes,
      details: {
        reportId: report._id,
        actionTaken: report.actionTaken
      }
    });

    res.status(200).json({
      success: true,
      message: `Moderation action "${action}" completed successfully.`,
      report
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Get paginated audit logs
// @route   GET /api/admin/audit-logs
// @access  Private (Admin)
exports.getAuditLogs = async (req, res, next) => {
  try {
    const { page = 1, limit = 25, action, targetType } = req.query;
    const filter = {};

    if (action && action !== 'all') filter.action = action;
    if (targetType && targetType !== 'all') filter.targetType = targetType;

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 25));
    const skip = (pageNum - 1) * limitNum;

    const [total, logs] = await Promise.all([
      AuditLog.countDocuments(filter),
      AuditLog.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .populate('actor', 'username name email role Profilepic')
        .lean()
    ]);

    res.status(200).json({
      success: true,
      logs,
      total,
      page: pageNum,
      pages: Math.ceil(total / limitNum)
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Get all currently suspended users
// @route   GET /api/admin/suspended-users
// @access  Private (Admin)
exports.getSuspendedUsers = async (req, res, next) => {
  try {
    const users = await User.find({ isSuspended: true })
      .select('-password')
      .sort({ suspendedAt: -1 })
      .lean();

    res.status(200).json({
      success: true,
      users,
      total: users.length
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Get aggregated list of all hidden content items
// @route   GET /api/admin/hidden-content
// @access  Private (Admin)
exports.getHiddenContent = async (req, res, next) => {
  try {
    const [hiddenPosts, hiddenReplies, hiddenProjects, hiddenLogs] = await Promise.all([
      Post.find({ isHidden: true }).populate('user', 'username name').sort({ updatedAt: -1 }).lean(),
      Reply.find({ isHidden: true }).populate('user', 'username name').sort({ updatedAt: -1 }).lean(),
      Project.find({ isHidden: true }).populate('owner', 'username name').sort({ updatedAt: -1 }).lean(),
      BuildLog.find({ isHidden: true }).populate('author', 'username name').sort({ updatedAt: -1 }).lean()
    ]);

    res.status(200).json({
      success: true,
      hiddenPosts,
      hiddenReplies,
      hiddenProjects,
      hiddenLogs,
      totalCount: hiddenPosts.length + hiddenReplies.length + hiddenProjects.length + hiddenLogs.length
    });
  } catch (err) {
    next(err);
  }
};
