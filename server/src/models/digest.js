const mongoose = require('mongoose');

const digestSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'user',
      required: true,
      index: true
    },
    periodKey: {
      type: String,
      required: true,
      trim: true
    },
    startDate: {
      type: Date,
      required: true
    },
    endDate: {
      type: Date,
      required: true
    },
    generatedAt: {
      type: Date,
      default: Date.now
    },
    summary: {
      type: String,
      default: ''
    },
    sections: {
      followedPosts: [
        {
          _id: { type: mongoose.Schema.Types.ObjectId },
          content: { type: String, default: '' },
          author: {
            _id: { type: mongoose.Schema.Types.ObjectId },
            username: String,
            name: String,
            Profilepic: String,
            isVerified: Boolean
          },
          replyCount: { type: Number, default: 0 },
          likesCount: { type: Number, default: 0 },
          createdAt: Date
        }
      ],
      postActivity: {
        totalNewReplies: { type: Number, default: 0 },
        totalNewLikes: { type: Number, default: 0 },
        interactions: [
          {
            type: { type: String, enum: ['reply', 'like', 'repost'] },
            postId: mongoose.Schema.Types.ObjectId,
            postExcerpt: String,
            actor: {
              _id: mongoose.Schema.Types.ObjectId,
              username: String,
              name: String,
              Profilepic: String
            },
            createdAt: Date
          }
        ]
      },
      unreadNotificationsCount: {
        type: Number,
        default: 0
      },
      unreadNotifications: [
        {
          _id: mongoose.Schema.Types.ObjectId,
          type: { type: String },
          sender: {
            _id: mongoose.Schema.Types.ObjectId,
            username: String,
            name: String,
            Profilepic: String
          },
          message: String,
          createdAt: Date
        }
      ],
      followedBuildLogs: [
        {
          _id: mongoose.Schema.Types.ObjectId,
          title: String,
          entryType: String,
          project: {
            _id: mongoose.Schema.Types.ObjectId,
            name: String,
            slug: String,
            ownerUsername: String
          },
          createdAt: Date
        }
      ],
      publicHighlights: [
        {
          type: { type: String, enum: ['project', 'post'] },
          _id: mongoose.Schema.Types.ObjectId,
          title: String,
          description: String,
          authorName: String,
          authorUsername: String,
          slug: String,
          techStack: [String],
          createdAt: Date
        }
      ]
    },
    isRead: {
      type: Boolean,
      default: false,
      index: true
    },
    readAt: {
      type: Date,
      default: null
    },
    deliveryStatus: {
      type: String,
      enum: ['in_app_only', 'sending', 'email_sent', 'email_failed', 'disabled', 'email_skipped'],
      default: 'in_app_only'
    },
    deliveryKey: {
      type: String,
      default: null,
      index: true
    },
    emailMessageId: {
      type: String,
      default: null
    },
    deliveryAttempts: {
      type: Number,
      default: 0
    },
    lastDeliveryAttemptAt: {
      type: Date,
      default: null
    },
    deliveryError: {
      type: String,
      default: null
    },
    isAmbiguousTimeout: {
      type: Boolean,
      default: false
    }
  },
  {
    timestamps: true
  }
);

// Compound unique index prevents duplicate digests for same user and period
digestSchema.index({ user: 1, periodKey: 1 }, { unique: true });
digestSchema.index({ user: 1, createdAt: -1 });

module.exports = mongoose.models.Digest || mongoose.model('Digest', digestSchema);
