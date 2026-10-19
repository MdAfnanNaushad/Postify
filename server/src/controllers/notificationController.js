const mongoose = require('mongoose');
const Notification = require('../models/notification');

// @desc    Get authenticated user's notifications (cursor-based pagination)
// @route   GET /api/notifications
// @access  Private
exports.getNotifications = async (req, res, next) => {
  try {
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit, 10) || 20));
    const cursor = req.query.cursor ? new Date(req.query.cursor) : null;
    const typeFilter = req.query.type;

    const query = { recipient: req.user._id };

    if (cursor && !isNaN(cursor.getTime())) {
      query.createdAt = { $lt: cursor };
    }

    if (typeFilter && ['like', 'reply', 'reply_interaction', 'follow', 'mention', 'repost', 'quote'].includes(typeFilter)) {
      query.type = typeFilter;
    }

    const notifications = await Notification.find(query)
      .sort({ createdAt: -1 })
      .limit(limit + 1)
      .populate('actor', 'username name Profilepic Bannerpic isVerified')
      .populate('post', 'content date')
      .populate('reply', 'content createdAt');

    const hasMore = notifications.length > limit;
    const paginatedNotifications = hasMore ? notifications.slice(0, limit) : notifications;
    const nextCursor =
      hasMore && paginatedNotifications.length > 0
        ? paginatedNotifications[paginatedNotifications.length - 1].createdAt
        : null;

    res.status(200).json({
      success: true,
      notifications: paginatedNotifications,
      pagination: {
        nextCursor,
        hasMore,
        count: paginatedNotifications.length
      }
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Get unread notification count
// @route   GET /api/notifications/unread-count
// @access  Private
exports.getUnreadCount = async (req, res, next) => {
  try {
    const count = await Notification.countDocuments({
      recipient: req.user._id,
      readAt: null
    });

    res.status(200).json({
      success: true,
      count,
      unreadCount: count
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Mark individual notification as read
// @route   PATCH /api/notifications/:id/read
// @access  Private
exports.markAsRead = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid notification identifier.'
      });
    }

    const notification = await Notification.findById(id);
    if (!notification) {
      return res.status(404).json({
        success: false,
        message: 'Notification not found.'
      });
    }

    // Security & Authorization: verify notification belongs to authenticated user
    if (notification.recipient.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Forbidden: You are not authorized to modify another user\'s notification.'
      });
    }

    notification.readAt = new Date();
    await notification.save();

    const populated = await Notification.findById(notification._id)
      .populate('actor', 'username name Profilepic Bannerpic isVerified')
      .populate('post', 'content date')
      .populate('reply', 'content createdAt');

    const unreadCount = await Notification.countDocuments({
      recipient: req.user._id,
      readAt: null
    });

    res.status(200).json({
      success: true,
      notification: populated,
      unreadCount
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Mark all notifications as read
// @route   PATCH /api/notifications/read-all
// @access  Private
exports.markAllAsRead = async (req, res, next) => {
  try {
    const result = await Notification.updateMany(
      { recipient: req.user._id, readAt: null },
      { $set: { readAt: new Date() } }
    );

    res.status(200).json({
      success: true,
      message: 'All notifications marked as read.',
      modifiedCount: result.modifiedCount
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Delete a notification
// @route   DELETE /api/notifications/:id
// @access  Private
exports.deleteNotification = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid notification identifier.'
      });
    }

    const notification = await Notification.findById(id);
    if (!notification) {
      return res.status(404).json({
        success: false,
        message: 'Notification not found.'
      });
    }

    // Security & Authorization: verify notification belongs to authenticated user
    if (notification.recipient.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Forbidden: You are not authorized to delete another user\'s notification.'
      });
    }

    await Notification.findByIdAndDelete(id);

    const unreadCount = await Notification.countDocuments({
      recipient: req.user._id,
      readAt: null
    });

    res.status(200).json({
      success: true,
      message: 'Notification deleted.',
      unreadCount
    });
  } catch (err) {
    next(err);
  }
};
