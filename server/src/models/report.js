const mongoose = require('mongoose');

const reportSchema = new mongoose.Schema(
  {
    reporter: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'user',
      required: [true, 'Reporter reference is required'],
      index: true
    },
    targetType: {
      type: String,
      required: [true, 'Target type is required'],
      enum: ['post', 'reply', 'project', 'buildLog', 'user'],
      index: true
    },
    targetId: {
      type: mongoose.Schema.Types.ObjectId,
      required: [true, 'Target ID is required'],
      index: true
    },
    reason: {
      type: String,
      required: [true, 'Report reason is required'],
      enum: ['spam', 'harassment', 'hate_speech', 'inappropriate', 'copyright', 'other']
    },
    description: {
      type: String,
      trim: true,
      maxlength: [500, 'Description cannot exceed 500 characters'],
      default: ''
    },
    status: {
      type: String,
      enum: ['pending', 'reviewed', 'actioned', 'dismissed'],
      default: 'pending',
      index: true
    },
    actionTaken: {
      type: String,
      enum: ['none', 'content_hidden', 'content_restored', 'user_suspended', 'user_unsuspended', 'dismissed'],
      default: 'none'
    },
    moderatorNotes: {
      type: String,
      trim: true,
      maxlength: [1000, 'Moderator notes cannot exceed 1000 characters'],
      default: ''
    },
    resolvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'user',
      default: null
    },
    resolvedAt: {
      type: Date,
      default: null
    }
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

// Compound indexes for performant moderation queue filtering and target lookups
reportSchema.index({ status: 1, createdAt: -1 });
reportSchema.index({ targetType: 1, targetId: 1, status: 1 });
reportSchema.index({ reporter: 1, targetType: 1, targetId: 1, status: 1 });

module.exports = mongoose.models.Report || mongoose.model('Report', reportSchema);
