const mongoose = require('mongoose');

// Preserve exact schema and field names to ensure 100% backward compatibility with miniproject database
const postSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'user',
      required: true
    },
    date: {
      type: Date,
      default: Date.now
    },
    content: {
      type: String,
      required: [true, 'Post content is required'],
      trim: true
    },
    quotedPost: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'post',
      default: null,
      index: true
    },
    tags: [
      {
        type: String,
        trim: true,
        lowercase: true,
        index: true
      }
    ],
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

// Compound indexes for feed pagination and user timeline performance
postSchema.index({ date: -1 });
postSchema.index({ user: 1, date: -1 });

// Virtual for convenient like count
postSchema.virtual('likeCount').get(function () {
  return this.likes ? this.likes.length : 0;
});

// Ensure model name matches existing collection ('post' -> 'posts' collection in Mongoose)
module.exports = mongoose.models.post || mongoose.model('post', postSchema);
