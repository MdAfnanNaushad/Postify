const mongoose = require('mongoose');

const digestPreferenceSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'user',
      required: true,
      unique: true,
      index: true
    },
    enabled: {
      type: Boolean,
      default: true
    },
    emailDelivery: {
      type: Boolean,
      default: false // Strictly opt-in: never default to true
    },
    deliveryDay: {
      type: String,
      enum: ['monday', 'sunday', 'friday', 'saturday'],
      default: 'monday'
    },
    timezone: {
      type: String,
      default: 'UTC',
      trim: true
    },
    includeFollowedPosts: {
      type: Boolean,
      default: true
    },
    includeInteractions: {
      type: Boolean,
      default: true
    },
    includeBuildLogs: {
      type: Boolean,
      default: true
    },
    includeHighlights: {
      type: Boolean,
      default: true
    },
    lastDeliveredAt: {
      type: Date,
      default: null
    },
    lastGeneratedPeriod: {
      type: String,
      default: null
    },
    lastDeliveryStatus: {
      type: String,
      default: null
    },
    lastDeliveryError: {
      type: String,
      default: null
    }
  },
  {
    timestamps: true
  }
);

module.exports =
  mongoose.models.DigestPreference ||
  mongoose.model('DigestPreference', digestPreferenceSchema);
