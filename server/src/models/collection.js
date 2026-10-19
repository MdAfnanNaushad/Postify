const mongoose = require('mongoose');

const collectionSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'user',
      required: true,
      index: true
    },
    name: {
      type: String,
      required: [true, 'Collection name is required.'],
      trim: true,
      maxlength: [60, 'Collection name cannot exceed 60 characters.']
    },
    description: {
      type: String,
      trim: true,
      maxlength: [300, 'Description cannot exceed 300 characters.'],
      default: ''
    }
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

// Compound index to support fast retrieval and prevent case-insensitive duplicate names for same user
collectionSchema.index({ user: 1, name: 1 });
collectionSchema.index({ user: 1, createdAt: -1 });

module.exports = mongoose.models.collection || mongoose.model('collection', collectionSchema);
