const Post = require('../models/post');
const User = require('../models/user');

// @desc    Get all posts (Chronological public feed)
// @route   GET /api/posts
// @access  Public
exports.getPosts = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 30;
    const skip = (page - 1) * limit;

    const filter = { isHidden: { $ne: true } };
    const total = await Post.countDocuments(filter);
    const posts = await Post.find(filter)
      .sort({ date: -1 })
      .skip(skip)
      .limit(limit)
      .populate('user', 'username name Profilepic Bannerpic isVerified')
      .populate({
        path: 'quotedPost',
        populate: {
          path: 'user',
          select: 'username name Profilepic Bannerpic isVerified'
        }
      });

    res.status(200).json({
      success: true,
      count: posts.length,
      total,
      page,
      pages: Math.ceil(total / limit),
      posts
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Get single post by ID
// @route   GET /api/posts/:id
// @access  Public
exports.getPostById = async (req, res, next) => {
  try {
    const post = await Post.findById(req.params.id)
      .populate('user', 'username name Profilepic Bannerpic isVerified')
      .populate({
        path: 'quotedPost',
        populate: {
          path: 'user',
          select: 'username name Profilepic Bannerpic isVerified'
        }
      });

    if (!post || (post.isHidden && (!req.user || (req.user.role !== 'moderator' && req.user.role !== 'admin')))) {
      return res.status(404).json({
        success: false,
        message: 'Post not found'
      });
    }

    const Repost = require('../models/repost');
    const repostsCount = await Repost.countDocuments({ post: post._id });

    let isReposted = false;
    const token = req.cookies?.token || req.headers.authorization?.replace(/^Bearer\s+/i, '');
    if (token) {
      try {
        const jwt = require('jsonwebtoken');
        const decoded = jwt.verify(
          token,
          process.env.JWT_SECRET || 'postify_super_secure_twilight_jwt_secret_2025_portal_key_!98'
        );
        const currentUserId = decoded.userid || decoded.id;
        if (currentUserId) {
          const repostExists = await Repost.exists({ user: currentUserId, post: post._id });
          isReposted = Boolean(repostExists);
        }
      } catch (e) {}
    }

    res.status(200).json({
      success: true,
      post: {
        ...post.toObject(),
        repostsCount,
        isReposted
      }
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Get social preview Open Graph metadata for a post
// @route   GET /api/posts/:id/preview
// @access  Public
exports.getPostSocialPreview = async (req, res, next) => {
  try {
    const post = await Post.findById(req.params.id).populate('user', 'username name Profilepic');

    if (!post) {
      return res.status(404).json({
        success: false,
        message: 'Post not found'
      });
    }

    const cleanDescription = (post.content || '')
      .replace(/[#*`_~\[\]]/g, '')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 160);
    const authorName = post.user?.name || post.user?.username || 'Postify Author';
    const baseUrl = process.env.CLIENT_URL || 'http://localhost:5173';
    const postUrl = `${baseUrl}/post/${post._id}`;
    const avatarUrl = post.user?.Profilepic
      ? `${baseUrl}/uploads/${post.user.Profilepic}`
      : `${baseUrl}/uploads/Profilepic.jpg`;

    res.status(200).json({
      success: true,
      metadata: {
        title: `${authorName} on Postify`,
        description: cleanDescription,
        url: postUrl,
        image: avatarUrl,
        author: authorName,
        date: post.date,
        canonical: postUrl
      }
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Create a new post (Standard story or Quote-Post)
// @route   POST /api/posts
// @access  Private
exports.createPost = async (req, res, next) => {
  try {
    const { content, quotedPost } = req.body;

    if (!content || !content.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Post content cannot be empty.'
      });
    }

    const { extractTags } = require('../utils/tagExtractor');
    const { createNotification, processMentions } = require('../services/notificationService');

    let quotedTargetAuthor = null;
    let quotedPostId = null;
    if (quotedPost) {
      const mongoose = require('mongoose');
      if (!mongoose.Types.ObjectId.isValid(quotedPost)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid quoted post identifier.'
        });
      }

      const quotedDoc = await Post.findById(quotedPost);
      if (!quotedDoc) {
        return res.status(404).json({
          success: false,
          message: 'Quoted post not found.'
        });
      }
      quotedPostId = quotedPost;
      quotedTargetAuthor = quotedDoc.user;
    }

    const tags = extractTags(content);

    const post = await Post.create({
      user: req.user._id,
      content: content.trim(),
      quotedPost: quotedPostId,
      tags,
      date: new Date(),
      likes: []
    });

    // Push post to user's posts array to maintain exact bidirectional relationship
    await User.findByIdAndUpdate(req.user._id, {
      $push: { posts: post._id }
    });

    // Notify author of quoted post if quote-post
    if (quotedTargetAuthor) {
      await createNotification({
        recipient: quotedTargetAuthor,
        actor: req.user._id,
        type: 'quote',
        post: post._id
      });
    }

    // Process @mentions in post content
    await processMentions({
      content,
      actorId: req.user._id,
      postId: post._id
    });

    const populatedPost = await Post.findById(post._id)
      .populate('user', 'username name Profilepic Bannerpic isVerified')
      .populate({
        path: 'quotedPost',
        populate: {
          path: 'user',
          select: 'username name Profilepic Bannerpic isVerified'
        }
      });

    res.status(201).json({
      success: true,
      post: populatedPost
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Update post owned by user (Strict Authorization Check)
// @route   PATCH /api/posts/:id
// @access  Private
exports.updatePost = async (req, res, next) => {
  try {
    const { content } = req.body;

    if (!content || !content.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Post content cannot be empty.'
      });
    }

    let post = await Post.findById(req.params.id);

    if (!post) {
      return res.status(404).json({
        success: false,
        message: 'Post not found'
      });
    }

    // Security & Authorization Check: Verify authenticated user is the post author
    if (post.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Forbidden: You are not authorized to update this post.'
      });
    }

    const { extractTags } = require('../utils/tagExtractor');
    const { processMentions } = require('../services/notificationService');

    post.content = content.trim();
    post.tags = extractTags(content);
    await post.save();

    // Process @mentions on edit
    await processMentions({
      content,
      actorId: req.user._id,
      postId: post._id
    });

    const updatedPost = await Post.findById(post._id).populate('user', 'username name Profilepic');

    res.status(200).json({
      success: true,
      post: updatedPost
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Delete post owned by user
// @route   DELETE /api/posts/:id
// @access  Private
exports.deletePost = async (req, res, next) => {
  try {
    const post = await Post.findById(req.params.id);

    if (!post) {
      return res.status(404).json({
        success: false,
        message: 'Post not found'
      });
    }

    // Security & Authorization Check
    if (post.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Forbidden: You are not authorized to delete this post.'
      });
    }

    // Remove reference from author's posts array
    await User.findByIdAndUpdate(post.user, {
      $pull: { posts: post._id }
    });

    // Cascade delete all replies associated with this post
    const Reply = require('../models/reply');
    await Reply.deleteMany({ post: post._id });

    // Cascade delete all reposts associated with this post
    const Repost = require('../models/repost');
    await Repost.deleteMany({ post: post._id });

    // Cascade delete all notifications associated with this post
    const Notification = require('../models/notification');
    await Notification.deleteMany({ post: post._id });

    // Cascade delete all bookmarks referencing this deleted post
    const Bookmark = require('../models/bookmark');
    await Bookmark.deleteMany({ post: post._id });

    // Clean up any user pinnedPosts referencing this post so profile pins don't break
    await User.updateMany({ pinnedPosts: post._id }, { $pull: { pinnedPosts: post._id } });

    // Nullify quotedPost references to this deleted post so quote-posts continue rendering gracefully
    await Post.updateMany({ quotedPost: post._id }, { $set: { quotedPost: null } });

    await Post.findByIdAndDelete(post._id);

    res.status(200).json({
      success: true,
      message: 'Post deleted successfully.'
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Like a post (Atomic & Idempotent PUT)
// @route   PUT /api/posts/:id/like
// @access  Private
exports.likePost = async (req, res, next) => {
  try {
    const { broadcastLikeUpdate } = require('../socket');
    
    // Check if user already liked the post before update
    const alreadyLiked = await Post.exists({ _id: req.params.id, likes: req.user._id });

    // Atomic $addToSet guarantees 100% duplicate prevention even under concurrent requests
    const post = await Post.findByIdAndUpdate(
      req.params.id,
      { $addToSet: { likes: req.user._id } },
      { new: true }
    );

    if (!post) {
      return res.status(404).json({
        success: false,
        message: 'Post not found'
      });
    }

    // Broadcast synchronized real-time count to all connected clients
    broadcastLikeUpdate(post._id, {
      likesCount: post.likes.length,
      likedUserId: req.user._id,
      action: 'like'
    });

    // Notify post author only on genuinely new like (self-likes filtered inside notificationService)
    if (!alreadyLiked) {
      const { createNotification } = require('../services/notificationService');
      await createNotification({
        recipient: post.user,
        actor: req.user._id,
        type: 'like',
        post: post._id
      });
    }

    res.status(200).json({
      success: true,
      liked: true,
      likesCount: post.likes.length,
      likes: post.likes
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Unlike a post (Atomic & Idempotent DELETE)
// @route   DELETE /api/posts/:id/like
// @access  Private
exports.unlikePost = async (req, res, next) => {
  try {
    const { broadcastLikeUpdate } = require('../socket');

    // Atomic $pull guarantees safe atomic removal under concurrent requests
    const post = await Post.findByIdAndUpdate(
      req.params.id,
      { $pull: { likes: req.user._id } },
      { new: true }
    );

    if (!post) {
      return res.status(404).json({
        success: false,
        message: 'Post not found'
      });
    }

    // Broadcast synchronized real-time count to all connected clients
    broadcastLikeUpdate(post._id, {
      likesCount: post.likes.length,
      likedUserId: req.user._id,
      action: 'unlike'
    });

    // Clean up like notification so future like is treated as genuine new interaction
    const { removeNotificationBySourceKey } = require('../services/notificationService');
    await removeNotificationBySourceKey(`like:${post._id}:${req.user._id}`, post.user);

    res.status(200).json({
      success: true,
      liked: false,
      likesCount: post.likes.length,
      likes: post.likes
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Repost an existing post (Atomic & Idempotent)
// @route   POST /api/posts/:id/repost
// @access  Private
exports.repostPost = async (req, res, next) => {
  try {
    const postId = req.params.id;
    const mongoose = require('mongoose');

    if (!postId || !mongoose.Types.ObjectId.isValid(postId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid post identifier.'
      });
    }

    const targetPost = await Post.findById(postId);
    if (!targetPost) {
      return res.status(404).json({
        success: false,
        message: 'Post to repost not found.'
      });
    }

    const Repost = require('../models/repost');
    const existingRepost = await Repost.exists({ user: req.user._id, post: postId });

    // Idempotent upsert via unique index { user: 1, post: 1 }
    await Repost.findOneAndUpdate(
      { user: req.user._id, post: postId },
      { $setOnInsert: { user: req.user._id, post: postId } },
      { upsert: true, new: true }
    );

    const repostsCount = await Repost.countDocuments({ post: postId });

    // Notify author of reposted post only on genuinely new repost
    if (!existingRepost) {
      const { createNotification } = require('../services/notificationService');
      await createNotification({
        recipient: targetPost.user,
        actor: req.user._id,
        type: 'repost',
        post: targetPost._id
      });
    }

    res.status(200).json({
      success: true,
      reposted: true,
      repostsCount
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Undo a repost (Atomic & Idempotent)
// @route   DELETE /api/posts/:id/repost
// @access  Private
exports.undoRepost = async (req, res, next) => {
  try {
    const postId = req.params.id;
    const mongoose = require('mongoose');

    if (!postId || !mongoose.Types.ObjectId.isValid(postId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid post identifier.'
      });
    }

    const Repost = require('../models/repost');
    await Repost.findOneAndDelete({
      user: req.user._id,
      post: postId
    });

    const repostsCount = await Repost.countDocuments({ post: postId });

    // Clean up repost notification so future repost is treated as genuine new interaction
    const targetPost = await Post.findById(postId).select('user');
    if (targetPost) {
      const { removeNotificationBySourceKey } = require('../services/notificationService');
      await removeNotificationBySourceKey(`repost:${postId}:${req.user._id}`, targetPost.user);
    }

    res.status(200).json({
      success: true,
      reposted: false,
      repostsCount
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Get personalized Following feed (followed users' posts and reposts)
// @route   GET /api/posts/following
// @access  Private
exports.getFollowingFeed = async (req, res, next) => {
  try {
    const Follow = require('../models/follow');
    const Repost = require('../models/repost');

    // 1. Fetch IDs of all users followed by current authenticated user
    const followingDocs = await Follow.find({ follower: req.user._id }).select('following');
    const followingIds = followingDocs.map((f) => f.following);

    if (followingIds.length === 0) {
      return res.status(200).json({
        success: true,
        posts: [],
        pagination: {
          nextCursor: null,
          hasMore: false,
          count: 0
        },
        message: 'You are not following any writers yet.'
      });
    }

    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit, 10) || 20));
    const cursor = req.query.cursor ? new Date(req.query.cursor) : null;

    // 2. Fetch posts authored by followed users
    const postQuery = { user: { $in: followingIds }, isHidden: { $ne: true } };
    if (cursor && !isNaN(cursor.getTime())) {
      postQuery.createdAt = { $lt: cursor };
    }

    const followedPosts = await Post.find(postQuery)
      .sort({ createdAt: -1 })
      .limit(limit + 5)
      .populate('user', 'username name Profilepic Bannerpic isVerified')
      .populate({
        path: 'quotedPost',
        populate: {
          path: 'user',
          select: 'username name Profilepic Bannerpic isVerified'
        }
      });

    // 3. Fetch reposts by followed users
    const repostQuery = { user: { $in: followingIds } };
    if (cursor && !isNaN(cursor.getTime())) {
      repostQuery.createdAt = { $lt: cursor };
    }

    const followedReposts = await Repost.find(repostQuery)
      .sort({ createdAt: -1 })
      .limit(limit + 5)
      .populate({
        path: 'post',
        populate: [
          { path: 'user', select: 'username name Profilepic Bannerpic isVerified' },
          {
            path: 'quotedPost',
            populate: { path: 'user', select: 'username name Profilepic Bannerpic isVerified' }
          }
        ]
      })
      .populate('user', 'username name Profilepic Bannerpic isVerified');

    // 4. Transform and unify feed items
    const feedItems = [];

    // Map followed posts
    for (const post of followedPosts) {
      feedItems.push({
        ...post.toObject(),
        feedId: `post_${post._id}`,
        isRepost: false,
        reposter: null,
        feedTime: post.createdAt || post.date || new Date()
      });
    }

    // Map followed reposts
    for (const repost of followedReposts) {
      // Discard repost if original post was deleted or hidden by moderation
      if (!repost.post || repost.post.isHidden) continue;

      feedItems.push({
        ...repost.post.toObject(),
        feedId: `repost_${repost._id}`,
        isRepost: true,
        reposter: repost.user,
        feedTime: repost.createdAt,
        repostId: repost._id
      });
    }

    // 5. Sort deterministically descending by feedTime, breaking ties with feedId
    feedItems.sort((a, b) => {
      const timeDiff = new Date(b.feedTime).getTime() - new Date(a.feedTime).getTime();
      if (timeDiff !== 0) return timeDiff;
      return b.feedId.localeCompare(a.feedId);
    });

    // 6. Paginate items
    const hasMore = feedItems.length > limit;
    const paginatedItems = feedItems.slice(0, limit);
    const nextCursor =
      hasMore && paginatedItems.length > 0
        ? paginatedItems[paginatedItems.length - 1].feedTime
        : null;

    res.status(200).json({
      success: true,
      posts: paginatedItems,
      pagination: {
        nextCursor,
        hasMore,
        count: paginatedItems.length
      }
    });
  } catch (err) {
    next(err);
  }
};
