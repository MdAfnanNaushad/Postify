const mongoose = require('mongoose');

const followSchema = new mongoose.Schema(
  {
    follower: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'user',
      required: true,
      index: true
    },
    following: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'user',
      required: true,
      index: true
    }
  },
  {
    timestamps: true
  }
);

// Compound unique index to guarantee no duplicate follow relationships
followSchema.index({ follower: 1, following: 1 }, { unique: true });
// Reverse compound index for fast follower counts and queries
followSchema.index({ following: 1, follower: 1 });

module.exports = mongoose.models.follow || mongoose.model('follow', followSchema);
