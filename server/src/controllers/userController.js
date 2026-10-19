const User = require('../models/user');
const Post = require('../models/post');

// @desc    Get user by ID with populated posts and pinnedPosts
// @route   GET /api/users/:id
// @access  Public
exports.getUserById = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id)
      .select('-password')
      .populate({
        path: 'pinnedPosts',
        populate: [
          { path: 'user', select: 'username name Profilepic Bannerpic isVerified' },
          { path: 'quotedPost', populate: { path: 'user', select: 'username name Profilepic Bannerpic isVerified' } }
        ]
      })
      .populate({
        path: 'posts',
        options: { sort: { date: -1 } },
        populate: [
          { path: 'user', select: 'username name Profilepic Bannerpic isVerified' },
          { path: 'quotedPost', populate: { path: 'user', select: 'username name Profilepic Bannerpic isVerified' } }
        ]
      });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const isOwnerPostify = user.username && user.username.toLowerCase() === 'postify';
    const isVerified = isOwnerPostify || Boolean(user.isVerified);

    const Follow = require('../models/follow');
    const [followersCount, followingCount] = await Promise.all([
      Follow.countDocuments({ following: user._id }),
      Follow.countDocuments({ follower: user._id })
    ]);

    let isFollowing = false;
    const token = req.cookies?.token || req.headers.authorization?.replace(/^Bearer\s+/i, '');
    if (token) {
      try {
        const jwt = require('jsonwebtoken');
        const decoded = jwt.verify(
          token,
          process.env.JWT_SECRET || 'postify_super_secure_twilight_jwt_secret_2025_portal_key_!98'
        );
        const currentUserId = decoded.userid || decoded.id;
        if (currentUserId && currentUserId.toString() !== user._id.toString()) {
          const followExists = await Follow.exists({ follower: currentUserId, following: user._id });
          isFollowing = Boolean(followExists);
        }
      } catch (e) {
        // Guest or invalid token
      }
    }

    // Filter out any dangling pinned posts where post was deleted
    const cleanPinnedPosts = (user.pinnedPosts || []).filter(Boolean);

    res.status(200).json({
      success: true,
      user: {
        ...user.toObject(),
        pinnedPosts: cleanPinnedPosts,
        isVerified,
        followersCount,
        followingCount,
        isFollowing
      }
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Update current user profile (Developer Identity & Contact Links)
// @route   PATCH /api/users/me
// @access  Private
exports.updateMe = async (req, res, next) => {
  try {
    // Strict mass-assignment protection: reject protected/immutable fields
    const protectedFields = ['role', 'isAdmin', 'isVerified', 'isSuspended', 'password', 'email', 'posts', 'pinnedPosts'];
    for (const field of protectedFields) {
      if (req.body && req.body[field] !== undefined) {
        return res.status(400).json({
          success: false,
          message: `Cannot modify protected field: ${field}`
        });
      }
    }

    const {
      name,
      username,
      age,
      bio,
      location,
      website,
      github,
      linkedin,
      techStack,
      selectedProjects
    } = req.body;

    const updates = {};
    if (name !== undefined) updates.name = name.trim();
    if (username !== undefined) updates.username = username.trim();
    if (age !== undefined) updates.age = Number(age);
    if (bio !== undefined) updates.bio = String(bio).trim().slice(0, 300);
    if (location !== undefined) updates.location = String(location).trim().slice(0, 100);

    // Validate and sanitize website URL
    if (website !== undefined) {
      const cleanWebsite = String(website).trim();
      if (cleanWebsite && !/^https?:\/\//i.test(cleanWebsite)) {
        return res.status(400).json({
          success: false,
          message: 'Website URL must begin with http:// or https://'
        });
      }
      updates.website = cleanWebsite.slice(0, 200);
    }

    // Validate and sanitize GitHub
    if (github !== undefined) {
      updates.github = String(github).trim().slice(0, 100);
    }

    // Validate and sanitize LinkedIn URL
    if (linkedin !== undefined) {
      const cleanLinkedIn = String(linkedin).trim();
      if (cleanLinkedIn && !/^https?:\/\//i.test(cleanLinkedIn)) {
        return res.status(400).json({
          success: false,
          message: 'LinkedIn URL must begin with http:// or https://'
        });
      }
      updates.linkedin = cleanLinkedIn.slice(0, 200);
    }

    // Validate and sanitize techStack
    if (techStack !== undefined) {
      if (Array.isArray(techStack)) {
        updates.techStack = Array.from(
          new Set(
            techStack
              .filter((t) => typeof t === 'string' && t.trim())
              .map((t) => t.trim().slice(0, 40))
          )
        ).slice(0, 30);
      }
    }

    // Validate and sanitize selectedProjects (Max 6 projects)
    if (selectedProjects !== undefined) {
      if (Array.isArray(selectedProjects)) {
        for (const proj of selectedProjects) {
          if (proj.projectUrl && String(proj.projectUrl).trim() && !/^https?:\/\//i.test(String(proj.projectUrl).trim())) {
            return res.status(400).json({
              success: false,
              message: 'Project URL must begin with http:// or https://'
            });
          }
          if (proj.repoUrl && String(proj.repoUrl).trim() && !/^https?:\/\//i.test(String(proj.repoUrl).trim())) {
            return res.status(400).json({
              success: false,
              message: 'Repository URL must begin with http:// or https://'
            });
          }
        }

        updates.selectedProjects = selectedProjects.slice(0, 6).map((proj) => ({
          name: String(proj.name || 'Untitled Project').trim().slice(0, 100),
          description: String(proj.description || '').trim().slice(0, 300),
          techStack: Array.isArray(proj.techStack)
            ? proj.techStack.filter((t) => typeof t === 'string').map((t) => t.trim().slice(0, 30))
            : [],
          projectUrl: String(proj.projectUrl || '').trim().slice(0, 200),
          repoUrl: String(proj.repoUrl || '').trim().slice(0, 200)
        }));
      }
    }

    const user = await User.findByIdAndUpdate(req.user._id, updates, {
      new: true,
      runValidators: true
    }).select('-password');

    res.status(200).json({
      success: true,
      user
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Pin a post to the authenticated user's profile
// @route   POST /api/users/me/pins/:postId
// @access  Private
exports.pinPost = async (req, res, next) => {
  try {
    const { postId } = req.params;
    const mongoose = require('mongoose');

    if (!postId || !mongoose.Types.ObjectId.isValid(postId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid post identifier.'
      });
    }

    const post = await Post.findById(postId);
    if (!post) {
      return res.status(404).json({
        success: false,
        message: 'Post not found.'
      });
    }

    // Authorization: users may only pin their own posts
    if (post.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'You can only pin your own published posts.'
      });
    }

    const currentUser = await User.findById(req.user._id);
    const existingPins = currentUser.pinnedPosts || [];

    // Duplicate check
    if (existingPins.some((id) => id.toString() === postId.toString())) {
      return res.status(400).json({
        success: false,
        message: 'This post is already pinned to your profile.'
      });
    }

    // Max 3 pinned posts
    if (existingPins.length >= 3) {
      return res.status(400).json({
        success: false,
        message: 'You can pin a maximum of 3 posts. Unpin an existing post first.'
      });
    }

    const updatedUser = await User.findByIdAndUpdate(
      req.user._id,
      { $addToSet: { pinnedPosts: post._id } },
      { new: true }
    )
      .select('-password')
      .populate('pinnedPosts');

    res.status(200).json({
      success: true,
      message: 'Post pinned to profile successfully.',
      pinnedPosts: updatedUser.pinnedPosts
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Unpin a post from the authenticated user's profile
// @route   DELETE /api/users/me/pins/:postId
// @access  Private
exports.unpinPost = async (req, res, next) => {
  try {
    const { postId } = req.params;
    const mongoose = require('mongoose');

    if (!postId || !mongoose.Types.ObjectId.isValid(postId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid post identifier.'
      });
    }

    const updatedUser = await User.findByIdAndUpdate(
      req.user._id,
      { $pull: { pinnedPosts: postId } },
      { new: true }
    )
      .select('-password')
      .populate('pinnedPosts');

    res.status(200).json({
      success: true,
      message: 'Post unpinned successfully.',
      pinnedPosts: updatedUser.pinnedPosts
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Upload / Update profile avatar
// @route   POST /api/users/me/avatar
// @access  Private
exports.updateAvatar = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'Please provide an image file to upload.'
      });
    }

    const fs = require('fs');
    const { isValidImageBuffer } = require('../middleware/upload');
    const { isImageKitConfigured, uploadToImageKit } = require('../services/imageKitService');
    const buffer = fs.readFileSync(req.file.path);

    // Deep content validation: inspect magic byte file signature
    if (!isValidImageBuffer(buffer)) {
      // Remove malicious/invalid uploaded file immediately
      fs.unlinkSync(req.file.path);
      return res.status(400).json({
        success: false,
        message: 'Invalid file signature. File is not a valid JPEG, PNG, WebP, or GIF image.'
      });
    }

    let finalImageUrl = req.file.filename;

    if (isImageKitConfigured()) {
      try {
        const ikRes = await uploadToImageKit({
          fileBuffer: buffer,
          fileName: req.file.filename,
          folder: '/postify/avatars',
          tags: ['avatar', req.user.username || 'user']
        });
        if (ikRes && ikRes.url) {
          finalImageUrl = ikRes.url;
          // Clean up local temporary file since file is now hosted on ImageKit CDN
          try {
            fs.unlinkSync(req.file.path);
          } catch (_) {}
        }
      } catch (uploadErr) {
        console.error('[ImageKit Avatar Upload Error]:', uploadErr.message);
      }
    }

    const updatedUser = await User.findByIdAndUpdate(
      req.user._id,
      { Profilepic: finalImageUrl },
      { new: true }
    ).select('-password');

    res.status(200).json({
      success: true,
      message: 'Avatar updated successfully',
      Profilepic: updatedUser.Profilepic,
      profilePic: updatedUser.Profilepic,
      user: updatedUser
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Upload / Update profile banner
// @route   POST /api/users/me/banner
// @access  Private
exports.updateBanner = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a banner image file to upload.'
      });
    }

    const fs = require('fs');
    const { isValidImageBuffer } = require('../middleware/upload');
    const { isImageKitConfigured, uploadToImageKit } = require('../services/imageKitService');
    const buffer = fs.readFileSync(req.file.path);

    // Deep content validation: inspect magic byte file signature
    if (!isValidImageBuffer(buffer)) {
      fs.unlinkSync(req.file.path);
      return res.status(400).json({
        success: false,
        message: 'Invalid file signature. File is not a valid JPEG, PNG, WebP, or GIF image.'
      });
    }

    let finalBannerUrl = req.file.filename;

    if (isImageKitConfigured()) {
      try {
        const ikRes = await uploadToImageKit({
          fileBuffer: buffer,
          fileName: req.file.filename,
          folder: '/postify/banners',
          tags: ['banner', req.user.username || 'user']
        });
        if (ikRes && ikRes.url) {
          finalBannerUrl = ikRes.url;
          try {
            fs.unlinkSync(req.file.path);
          } catch (_) {}
        }
      } catch (uploadErr) {
        console.error('[ImageKit Banner Upload Error]:', uploadErr.message);
      }
    }

    const updatedUser = await User.findByIdAndUpdate(
      req.user._id,
      { Bannerpic: finalBannerUrl },
      { new: true }
    ).select('-password');

    res.status(200).json({
      success: true,
      message: 'Banner updated successfully',
      Bannerpic: updatedUser.Bannerpic,
      bannerPic: updatedUser.Bannerpic,
      user: updatedUser
    });
  } catch (err) {
    next(err);
  }
};
