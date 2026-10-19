const mongoose = require('mongoose');

const bookmarkSchema = new mongoose.Schema(
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
    },
    collection: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'collection',
      default: null,
      index: true
    },
    createdAt: {
      type: Date,
      default: Date.now,
      index: true
    }
  },
  {
    timestamps: false,
    suppressReservedKeysWarning: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

// Compound unique index prevents duplicate active bookmarks for the same user and post
bookmarkSchema.index({ user: 1, post: 1 }, { unique: true });

// Index for chronological retrieval of user bookmarks and collection filtering
bookmarkSchema.index({ user: 1, collection: 1, createdAt: -1 });

module.exports = mongoose.models.bookmark || mongoose.model('bookmark', bookmarkSchema);
