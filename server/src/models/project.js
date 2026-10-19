const mongoose = require('mongoose');

const projectSchema = new mongoose.Schema(
  {
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'user',
      required: [true, 'Project owner is required'],
      index: true
    },
    name: {
      type: String,
      required: [true, 'Project name is required'],
      trim: true,
      maxlength: [100, 'Project name cannot exceed 100 characters']
    },
    slug: {
      type: String,
      required: [true, 'Project slug is required'],
      trim: true,
      lowercase: true,
      maxlength: [120, 'Slug cannot exceed 120 characters']
    },
    shortDescription: {
      type: String,
      trim: true,
      maxlength: [300, 'Short description cannot exceed 300 characters'],
      default: ''
    },
    description: {
      type: String,
      trim: true,
      maxlength: [5000, 'Detailed description cannot exceed 5000 characters'],
      default: ''
    },
    techStack: [
      {
        type: String,
        trim: true,
        maxlength: [40, 'Technology name cannot exceed 40 characters']
      }
    ],
    repositoryUrl: {
      type: String,
      trim: true,
      default: ''
    },
    liveUrl: {
      type: String,
      trim: true,
      default: ''
    },
    coverImage: {
      type: String,
      trim: true,
      default: ''
    },
    status: {
      type: String,
      enum: ['planned', 'in_progress', 'paused', 'completed', 'archived'],
      default: 'in_progress',
      index: true
    },
    visibility: {
      type: String,
      enum: ['public', 'private'],
      default: 'public',
      index: true
    },
    startedAt: {
      type: Date,
      default: null
    },
    completedAt: {
      type: Date,
      default: null
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

// Compound unique index ensuring each owner has unique slugs
projectSchema.index({ owner: 1, slug: 1 }, { unique: true });
projectSchema.index({ visibility: 1, createdAt: -1 });
projectSchema.index({ owner: 1, visibility: 1, createdAt: -1 });
projectSchema.index({ techStack: 1 });
projectSchema.index({ status: 1 });

module.exports = mongoose.models.Project || mongoose.model('Project', projectSchema);
