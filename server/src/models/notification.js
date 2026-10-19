const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema(
  {
    recipient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'user',
      required: true,
      index: true
    },
    actor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'user',
      required: true
    },
    type: {
      type: String,
      required: true,
      enum: ['like', 'reply', 'reply_interaction', 'follow', 'mention', 'repost', 'quote'],
      index: true
    },
    post: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'post',
      default: null,
      index: true
    },
    reply: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'reply',
      default: null,
      index: true
    },
    readAt: {
      type: Date,
      default: null,
      index: true
    },
    sourceKey: {
      type: String,
      default: null,
      index: true
    }
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

// Compound indexes for fast chronological retrieval and unread notification queries
notificationSchema.index({ recipient: 1, createdAt: -1 });
notificationSchema.index({ recipient: 1, readAt: 1, createdAt: -1 });

// Deduplication compound indexes for single-instance events (likes, follows, reposts)
notificationSchema.index(
  { recipient: 1, actor: 1, type: 1, post: 1 },
  { partialFilterExpression: { type: { $in: ['like', 'repost'] } } }
);

notificationSchema.index(
  { recipient: 1, actor: 1, type: 1 },
  { partialFilterExpression: { type: 'follow' } }
);

module.exports = mongoose.models.notification || mongoose.model('notification', notificationSchema);
