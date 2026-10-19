const mongoose = require('mongoose');
const Report = require('../models/report');
const AuditLog = require('../models/auditLog');
const User = require('../models/user');
const Post = require('../models/post');
const Reply = require('../models/reply');
const Project = require('../models/project');
const BuildLog = require('../models/buildLog');

const VALID_REASONS = ['spam', 'harassment', 'hate_speech', 'inappropriate', 'copyright', 'other'];
const VALID_TARGET_TYPES = ['post', 'reply', 'project', 'buildLog', 'user'];

// @desc    Submit abuse / content report
// @route   POST /api/reports
// @access  Private (Authenticated User)
exports.createReport = async (req, res, next) => {
  try {
    const { targetType, targetId, reason, description } = req.body;

    if (!targetType || !VALID_TARGET_TYPES.includes(targetType)) {
      return res.status(400).json({
        success: false,
        message: `Invalid targetType. Must be one of: ${VALID_TARGET_TYPES.join(', ')}`
      });
    }

    if (!targetId || !mongoose.isValidObjectId(targetId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid target ID format.'
      });
    }

    if (!reason || !VALID_REASONS.includes(reason)) {
      return res.status(400).json({
        success: false,
        message: `Invalid reason. Must be one of: ${VALID_REASONS.join(', ')}`
      });
    }

    const cleanDescription = String(description || '').trim().slice(0, 500);

    // Verify target exists in database and enforce self-reporting boundaries
    let targetDoc = null;
    let targetOwnerId = null;

    if (targetType === 'post') {
      targetDoc = await Post.findById(targetId);
      if (!targetDoc) return res.status(404).json({ success: false, message: 'Reported post not found.' });
      targetOwnerId = targetDoc.user;
    } else if (targetType === 'reply') {
      targetDoc = await Reply.findById(targetId);
      if (!targetDoc) return res.status(404).json({ success: false, message: 'Reported reply not found.' });
      targetOwnerId = targetDoc.user;
    } else if (targetType === 'project') {
      targetDoc = await Project.findById(targetId);
      if (!targetDoc) return res.status(404).json({ success: false, message: 'Reported project not found.' });
      targetOwnerId = targetDoc.owner;
    } else if (targetType === 'buildLog') {
      targetDoc = await BuildLog.findById(targetId);
      if (!targetDoc) return res.status(404).json({ success: false, message: 'Reported build log not found.' });
      targetOwnerId = targetDoc.author;
    } else if (targetType === 'user') {
      targetDoc = await User.findById(targetId);
      if (!targetDoc) return res.status(404).json({ success: false, message: 'Reported user profile not found.' });
      targetOwnerId = targetDoc._id;
    }

    // Prevent reporting own content or self
    if (targetOwnerId && targetOwnerId.toString() === req.user._id.toString()) {
      return res.status(400).json({
        success: false,
        message: 'You cannot report your own content or profile.'
      });
    }

    // Prevent duplicate report spam while an active report is pending
    const existingActiveReport = await Report.findOne({
      reporter: req.user._id,
      targetType,
      targetId,
      status: { $in: ['pending', 'reviewed'] }
    });

    if (existingActiveReport) {
      return res.status(400).json({
        success: false,
        message: 'You have already submitted a report for this item that is currently pending review.'
      });
    }

    const report = await Report.create({
      reporter: req.user._id,
      targetType,
      targetId,
      reason,
      description: cleanDescription,
      status: 'pending'
    });

    res.status(201).json({
      success: true,
      message: 'Report submitted successfully. Thank you for helping keep Postify safe.',
      reportId: report._id
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Get reports queue for moderators
// @route   GET /api/moderation/reports
// @access  Moderator / Admin
exports.getReports = async (req, res, next) => {
  try {
    const { status = 'pending', targetType, page = 1, limit = 20 } = req.query;
    const filter = {};

    if (status && ['pending', 'reviewed', 'actioned', 'dismissed', 'all'].includes(status)) {
      if (status !== 'all') filter.status = status;
    } else {
      filter.status = 'pending';
    }

    if (targetType && VALID_TARGET_TYPES.includes(targetType)) {
      filter.targetType = targetType;
    }

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(50, Math.max(1, parseInt(limit, 10) || 20));
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

// @desc    Get single report details
// @route   GET /api/moderation/reports/:id
// @access  Moderator / Admin
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

    // Enforce target content resolution
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
// @route   PATCH /api/moderation/reports/:id/action
// @access  Moderator / Admin
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

    // Execute reversible enforcement actions
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
        // Resolve author from content
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

    // Create immutable audit log entry
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

// @desc    Get moderation audit trail
// @route   GET /api/moderation/audit-logs
// @access  Admin Only
exports.getAuditLogs = async (req, res, next) => {
  try {
    const { page = 1, limit = 25 } = req.query;
    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 25));
    const skip = (pageNum - 1) * limitNum;

    const [total, logs] = await Promise.all([
      AuditLog.countDocuments({}),
      AuditLog.find({})
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .populate('actor', 'username name email role')
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
