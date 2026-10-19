const mongoose = require('mongoose');

const replySchema = new mongoose.Schema(
  {
    post: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'post',
      required: [true, 'Post reference is required'],
      index: true
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'user',
      required: [true, 'Author user reference is required'],
      index: true
    },
    parentReply: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'reply',
      default: null,
      index: true
    },
    depth: {
      type: Number,
      default: 0,
      min: 0,
      max: [2, 'Maximum thread depth of 2 exceeded']
    },
    content: {
      type: String,
      required: [true, 'Reply content cannot be empty'],
      trim: true,
      maxlength: [1500, 'Reply content cannot exceed 1500 characters']
    },
    likes: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'user'
      }
    ],
    isHidden: {
      type: Boolean,
      default: false,
      index: true
    },
    moderationReason: {
      type: String,
      default: ''
    }
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

// Compound indexes for efficient threaded conversation retrieval and shallow nesting
replySchema.index({ post: 1, createdAt: 1 });
replySchema.index({ post: 1, parentReply: 1, createdAt: 1 });

// Virtual for like count
replySchema.virtual('likeCount').get(function () {
  return this.likes ? this.likes.length : 0;
});

module.exports = mongoose.models.reply || mongoose.model('reply', replySchema);
