const mongoose = require('mongoose');

const buildLogSchema = new mongoose.Schema(
  {
    project: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Project',
      required: [true, 'Project reference is required'],
      index: true
    },
    author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'user',
      required: [true, 'Log author is required'],
      index: true
    },
    title: {
      type: String,
      required: [true, 'Log title is required'],
      trim: true,
      maxlength: [150, 'Title cannot exceed 150 characters']
    },
    content: {
      type: String,
      required: [true, 'Log content is required'],
      trim: true,
      maxlength: [15000, 'Content cannot exceed 15000 characters']
    },
    entryType: {
      type: String,
      enum: ['milestone', 'feature', 'fix', 'refactor', 'research', 'release', 'note'],
      default: 'feature',
      index: true
    },
    tags: [
      {
        type: String,
        trim: true,
        maxlength: [40, 'Tag cannot exceed 40 characters']
      }
    ],
    media: [
      {
        type: String,
        trim: true
      }
    ],
    isPinned: {
      type: Boolean,
      default: false
    },
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
  { timestamps: true }
);

// Timeline indices: chronological ordering with deterministic tie-breaking by _id
buildLogSchema.index({ project: 1, isPinned: -1, createdAt: 1, _id: 1 });
buildLogSchema.index({ project: 1, isPinned: -1, createdAt: -1, _id: -1 });
buildLogSchema.index({ project: 1, createdAt: 1, _id: 1 });
buildLogSchema.index({ project: 1, createdAt: -1 });
buildLogSchema.index({ author: 1, createdAt: -1 });

module.exports = mongoose.models.BuildLog || mongoose.model('BuildLog', buildLogSchema);
