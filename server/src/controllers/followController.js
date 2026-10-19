const mongoose = require('mongoose');
const Follow = require('../models/follow');
const User = require('../models/user');

// @desc    Follow a user
// @route   POST /api/users/:id/follow
// @access  Private
exports.followUser = async (req, res, next) => {
  try {
    const targetUserId = req.params.id;

    if (!targetUserId || !mongoose.Types.ObjectId.isValid(targetUserId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid user identifier.'
      });
    }

    // Security Guard: Prevent users from following themselves
    if (req.user._id.toString() === targetUserId) {
      return res.status(400).json({
        success: false,
        message: 'You cannot follow yourself.'
      });
    }

    // Verify target user exists
    const targetUserExists = await User.exists({ _id: targetUserId });
    if (!targetUserExists) {
      return res.status(404).json({
        success: false,
        message: 'User to follow not found.'
      });
    }

    const existingFollow = await Follow.exists({ follower: req.user._id, following: targetUserId });

    // Atomic idempotent follow insertion using unique index
    await Follow.findOneAndUpdate(
      { follower: req.user._id, following: targetUserId },
      { $setOnInsert: { follower: req.user._id, following: targetUserId } },
      { upsert: true, new: true }
    );

    const followersCount = await Follow.countDocuments({ following: targetUserId });
    const followingCount = await Follow.countDocuments({ follower: req.user._id });

    // Event 4: Notify target user about new follower only on genuinely new follow
    if (!existingFollow) {
      const { createNotification } = require('../services/notificationService');
      await createNotification({
        recipient: targetUserId,
        actor: req.user._id,
        type: 'follow'
      });
    }

    res.status(200).json({
      success: true,
      following: true,
      followersCount,
      followingCount
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Unfollow a user
// @route   DELETE /api/users/:id/follow
// @access  Private
exports.unfollowUser = async (req, res, next) => {
  try {
    const targetUserId = req.params.id;

    if (!targetUserId || !mongoose.Types.ObjectId.isValid(targetUserId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid user identifier.'
      });
    }

    // Prevent self-unfollow check
    if (req.user._id.toString() === targetUserId) {
      return res.status(400).json({
        success: false,
        message: 'You cannot unfollow yourself.'
      });
    }

    await Follow.findOneAndDelete({
      follower: req.user._id,
      following: targetUserId
    });

    const followersCount = await Follow.countDocuments({ following: targetUserId });
    const followingCount = await Follow.countDocuments({ follower: req.user._id });

    res.status(200).json({
      success: true,
      following: false,
      followersCount,
      followingCount
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Get user's followers
// @route   GET /api/users/:id/followers
// @access  Public
exports.getFollowers = async (req, res, next) => {
  try {
    const targetUserId = req.params.id;

    if (!targetUserId || !mongoose.Types.ObjectId.isValid(targetUserId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid user identifier.'
      });
    }

    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit, 10) || 20));
    const skip = (page - 1) * limit;

    const [follows, total] = await Promise.all([
      Follow.find({ following: targetUserId })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('follower', 'username name Profilepic Bannerpic isVerified'),
      Follow.countDocuments({ following: targetUserId })
    ]);

    const followers = follows.map((f) => f.follower).filter(Boolean);

    res.status(200).json({
      success: true,
      followers,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Get user's following list
// @route   GET /api/users/:id/following
// @access  Public
exports.getFollowing = async (req, res, next) => {
  try {
    const targetUserId = req.params.id;

    if (!targetUserId || !mongoose.Types.ObjectId.isValid(targetUserId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid user identifier.'
      });
    }

    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit, 10) || 20));
    const skip = (page - 1) * limit;

    const [follows, total] = await Promise.all([
      Follow.find({ follower: targetUserId })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('following', 'username name Profilepic Bannerpic isVerified'),
      Follow.countDocuments({ follower: targetUserId })
    ]);

    const following = follows.map((f) => f.following).filter(Boolean);

    res.status(200).json({
      success: true,
      following,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (err) {
    next(err);
  }
};
