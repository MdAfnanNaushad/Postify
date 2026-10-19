const mongoose = require('mongoose');

const repostSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'user',
      required: true,
      index: true
    },
    post: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'post',
      required: true,
      index: true
    }
  },
  {
    timestamps: true
  }
);

// Compound unique index prevents duplicate active reposts by the same user for the same post
repostSchema.index({ user: 1, post: 1 }, { unique: true });
// Secondary index for efficient repost counts per post
repostSchema.index({ post: 1, createdAt: -1 });

module.exports = mongoose.models.repost || mongoose.model('repost', repostSchema);
