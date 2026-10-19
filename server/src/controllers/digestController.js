const mongoose = require('mongoose');
const Digest = require('../models/digest');
const DigestPreference = require('../models/digestPreference');
const {
  getDigestForUser,
  generateDigestForUser,
  getDigestHistory
} = require('../services/digestService');
const { getWeekBounds } = require('../utils/digestUtils');
const { isEmailConfigured } = require('../services/emailService');

// @desc    Get current weekly digest for authenticated user
// @route   GET /api/digest/current
// @access  Private
exports.getCurrentDigest = async (req, res, next) => {
  try {
    const { periodKey, label, startDate, endDate } = getWeekBounds();
    const digest = await getDigestForUser(req.user._id, periodKey);

    res.status(200).json({
      success: true,
      periodKey,
      dateRangeLabel: label,
      startDate,
      endDate,
      digest
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Get user's past digest periods
// @route   GET /api/digest/history
// @access  Private
exports.getDigestHistory = async (req, res, next) => {
  try {
    const history = await getDigestHistory(req.user._id, 12);
    res.status(200).json({
      success: true,
      history
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Get digest by specific period key (e.g. "2026-W42")
// @route   GET /api/digest/:periodKey
// @access  Private
exports.getDigestByPeriod = async (req, res, next) => {
  try {
    const { periodKey } = req.params;

    if (!/^\d{4}-W\d{2}$/.test(periodKey)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid periodKey format. Expected format: YYYY-Www (e.g. 2026-W42).'
      });
    }

    const digest = await Digest.findOne({
      user: req.user._id,
      periodKey
    });

    if (!digest) {
      return res.status(404).json({
        success: false,
        message: 'Digest for this period not found.'
      });
    }

    const { label } = getWeekBounds(periodKey);

    res.status(200).json({
      success: true,
      dateRangeLabel: label,
      digest
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Mark digest as viewed / read
// @route   PATCH /api/digest/:digestId/read
// @access  Private
exports.markDigestAsRead = async (req, res, next) => {
  try {
    const { digestId } = req.params;

    if (!mongoose.isValidObjectId(digestId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid digest ID format.'
      });
    }

    const digest = await Digest.findById(digestId);
    if (!digest) {
      return res.status(404).json({
        success: false,
        message: 'Digest not found.'
      });
    }

    // Strict cross-user isolation: only owner can mark as read
    if (digest.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'You are not authorized to access this digest.'
      });
    }

    digest.isRead = true;
    digest.readAt = new Date();
    await digest.save();

    res.status(200).json({
      success: true,
      message: 'Digest marked as read.',
      digest
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Get digest preferences for authenticated user
// @route   GET /api/digest/preferences
// @access  Private
exports.getDigestPreferences = async (req, res, next) => {
  try {
    let pref = await DigestPreference.findOne({ user: req.user._id });

    if (!pref) {
      // Return default preferences
      pref = {
        enabled: true,
        emailDelivery: false,
        deliveryDay: 'monday',
        timezone: 'UTC',
        includeFollowedPosts: true,
        includeInteractions: true,
        includeBuildLogs: true,
        includeHighlights: true
      };
    }

    res.status(200).json({
      success: true,
      preferences: pref,
      emailConfigured: isEmailConfigured(),
      emailProvider: 'resend'
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Update digest preferences
// @route   PUT /api/digest/preferences
// @access  Private
exports.updateDigestPreferences = async (req, res, next) => {
  try {
    const allowedKeys = [
      'enabled',
      'emailDelivery',
      'deliveryDay',
      'timezone',
      'includeFollowedPosts',
      'includeInteractions',
      'includeBuildLogs',
      'includeHighlights'
    ];

    // Reject attempt to update protected user fields (passwords, emails, roles, etc.)
    const forbiddenKeys = ['password', 'email', 'username', 'role', '_id', 'user'];
    for (const key of forbiddenKeys) {
      if (req.body[key] !== undefined) {
        return res.status(400).json({
          success: false,
          message: `Cannot update user account field '${key}' via digest preferences.`
        });
      }
    }

    const {
      enabled,
      emailDelivery,
      deliveryDay,
      timezone,
      includeFollowedPosts,
      includeInteractions,
      includeBuildLogs,
      includeHighlights
    } = req.body;

    // Validate deliveryDay
    if (deliveryDay !== undefined && !['monday', 'sunday', 'friday', 'saturday'].includes(deliveryDay)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid deliveryDay. Allowed: monday, sunday, friday, saturday.'
      });
    }

    // Validate timezone string length
    if (timezone !== undefined && (typeof timezone !== 'string' || timezone.length > 50)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid timezone.'
      });
    }

    let pref = await DigestPreference.findOne({ user: req.user._id });

    if (!pref) {
      pref = new DigestPreference({
        user: req.user._id
      });
    }

    if (enabled !== undefined) pref.enabled = Boolean(enabled);
    if (emailDelivery !== undefined) pref.emailDelivery = Boolean(emailDelivery);
    if (deliveryDay !== undefined) pref.deliveryDay = deliveryDay;
    if (timezone !== undefined) pref.timezone = timezone.trim();
    if (includeFollowedPosts !== undefined) pref.includeFollowedPosts = Boolean(includeFollowedPosts);
    if (includeInteractions !== undefined) pref.includeInteractions = Boolean(includeInteractions);
    if (includeBuildLogs !== undefined) pref.includeBuildLogs = Boolean(includeBuildLogs);
    if (includeHighlights !== undefined) pref.includeHighlights = Boolean(includeHighlights);

    await pref.save();

    res.status(200).json({
      success: true,
      message: 'Digest preferences updated successfully.',
      preferences: pref,
      emailConfigured: isEmailConfigured(),
      emailProvider: 'resend'
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Controlled invocation to generate or refresh digest for current user
// @route   POST /api/digest/generate
// @access  Private
exports.generateDigestManually = async (req, res, next) => {
  try {
    const { periodKey } = req.body;
    const force = Boolean(req.body.force);

    const targetPeriod = periodKey || getWeekBounds().periodKey;
    const digest = await generateDigestForUser(req.user._id, targetPeriod, { force });

    res.status(200).json({
      success: true,
      message: 'Digest generated successfully.',
      digest
    });
  } catch (err) {
    next(err);
  }
};
