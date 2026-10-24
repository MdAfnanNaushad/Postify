const mongoose = require('mongoose');

// Preserve exact schema and field names to ensure 100% backward compatibility with miniproject database
const userSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      trim: true
    },
    name: {
      type: String,
      trim: true
    },
    age: {
      type: Number
    },
    email: {
      type: String,
      trim: true,
      lowercase: true
    },
    password: {
      type: String
    },
    Profilepic: {
      type: String,
      default: 'Profilepic.jpg'
    },
    Bannerpic: {
      type: String,
      default: ''
    },
    isVerified: {
      type: Boolean,
      default: false
    },
    badge: {
      type: String,
      trim: true,
      default: ''
    },
    badgeTitle: {
      type: String,
      trim: true,
      default: ''
    },
    role: {
      type: String,
      enum: ['user', 'moderator', 'admin'],
      default: 'user',
      index: true
    },
    isSuspended: {
      type: Boolean,
      default: false,
      index: true
    },
    suspendedReason: {
      type: String,
      default: ''
    },
    suspendedAt: {
      type: Date,
      default: null
    },
    bio: {
      type: String,
      trim: true,
      maxlength: [300, 'Bio cannot exceed 300 characters'],
      default: ''
    },
    location: {
      type: String,
      trim: true,
      maxlength: [100, 'Location cannot exceed 100 characters'],
      default: ''
    },
    website: {
      type: String,
      trim: true,
      maxlength: [200, 'Website URL cannot exceed 200 characters'],
      default: ''
    },
    github: {
      type: String,
      trim: true,
      maxlength: [100, 'GitHub handle/URL cannot exceed 100 characters'],
      default: ''
    },
    linkedin: {
      type: String,
      trim: true,
      maxlength: [200, 'LinkedIn profile cannot exceed 200 characters'],
      default: ''
    },
    techStack: [
      {
        type: String,
        trim: true,
        maxlength: [40, 'Technology name cannot exceed 40 characters']
      }
    ],
    selectedProjects: [
      {
        name: {
          type: String,
          required: [true, 'Project name is required'],
          trim: true,
          maxlength: [100, 'Project name cannot exceed 100 characters']
        },
        description: {
          type: String,
          trim: true,
          maxlength: [300, 'Project description cannot exceed 300 characters'],
          default: ''
        },
        techStack: [
          {
            type: String,
            trim: true
          }
        ],
        projectUrl: {
          type: String,
          trim: true,
          default: ''
        },
        repoUrl: {
          type: String,
          trim: true,
          default: ''
        }
      }
    ],
    pinnedPosts: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'post'
      }
    ],
    posts: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'post'
      }
    ]
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform: function (doc, ret) {
        delete ret.password;
        if (ret.username && ret.username.toLowerCase() === 'postify') {
          ret.isVerified = true;
        }
        return ret;
      }
    },
    toObject: { virtuals: true }
  }
);

// Virtual alias to provide clean camelCase profilePic access while preserving Profilepic
userSchema.virtual('profilePic').get(function () {
  return this.Profilepic || 'Profilepic.jpg';
});

// Virtual alias for bannerPic
userSchema.virtual('bannerPic').get(function () {
  return this.Bannerpic || '';
});

// Virtual alias for verified status (prebuilt for postify owner or 100+ likes)
userSchema.virtual('verified').get(function () {
  if (this.username && this.username.toLowerCase() === 'postify') return true;
  return Boolean(this.isVerified);
});

// Ensure model name matches existing collection ('user' -> 'users' collection in Mongoose)
module.exports = mongoose.models.user || mongoose.model('user', userSchema);
