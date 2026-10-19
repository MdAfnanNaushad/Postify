const Reply = require('../models/reply');
const Post = require('../models/post');
const { broadcastNewReply, broadcastUpdatedReply, broadcastDeletedReply } = require('../socket');

// @desc    Get all replies for a post (Threaded chronological order)
// @route   GET /api/posts/:postId/replies
// @access  Public
exports.getRepliesForPost = async (req, res, next) => {
  try {
    const { postId } = req.params;

    if (!postId || !/^[0-9a-fA-F]{24}$/.test(postId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid post identifier.'
      });
    }

    const post = await Post.findById(postId);
    if (!post) {
      return res.status(404).json({
        success: false,
        message: 'Post not found'
      });
    }

    const page = parseInt(req.query.page, 10) || 1;
    const limit = Math.min(parseInt(req.query.limit, 10) || 50, 100);
    const skip = (page - 1) * limit;

    const filter = { post: postId, isHidden: { $ne: true } };
    const total = await Reply.countDocuments(filter);
    const replies = await Reply.find(filter)
      .sort({ createdAt: 1 })
      .skip(skip)
      .limit(limit)
      .populate('user', 'username name Profilepic Bannerpic isVerified');

    res.status(200).json({
      success: true,
      count: replies.length,
      total,
      page,
      pages: Math.ceil(total / limit),
      replies
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Create a new reply to a post or existing reply
// @route   POST /api/posts/:postId/replies
// @access  Private
exports.createReply = async (req, res, next) => {
  try {
    const { postId } = req.params;
    const { content, parentReply } = req.body;

    if (!postId || !/^[0-9a-fA-F]{24}$/.test(postId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid post identifier.'
      });
    }

    if (!content || !content.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Reply content cannot be empty.'
      });
    }

    if (content.trim().length > 1500) {
      return res.status(400).json({
        success: false,
        message: 'Reply content cannot exceed 1500 characters.'
      });
    }

    const post = await Post.findById(postId);
    if (!post) {
      return res.status(404).json({
        success: false,
        message: 'Cannot reply to a non-existent post.'
      });
    }

    let depth = 0;
    let validatedParentId = null;
    let parentDoc = null;

    if (parentReply) {
      if (!/^[0-9a-fA-F]{24}$/.test(parentReply)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid parent reply identifier.'
        });
      }

      parentDoc = await Reply.findById(parentReply);
      if (!parentDoc) {
        return res.status(404).json({
          success: false,
          message: 'Parent reply not found.'
        });
      }

      // Security & Integrity: Confirm parent reply belongs to the exact same post
      if (parentDoc.post.toString() !== postId.toString()) {
        return res.status(400).json({
          success: false,
          message: 'Parent reply belongs to a different post.'
        });
      }

      depth = (parentDoc.depth || 0) + 1;
      // Enforce controlled shallow thread depth (maximum depth = 2)
      if (depth > 2) {
        return res.status(400).json({
          success: false,
          message: 'Maximum discussion nesting depth exceeded. Please reply to the main thread.'
        });
      }

      validatedParentId = parentDoc._id;
    }

    const reply = await Reply.create({
      post: postId,
      user: req.user._id,
      parentReply: validatedParentId,
      depth,
      content: content.trim(),
      likes: []
    });

    const populatedReply = await Reply.findById(reply._id).populate(
      'user',
      'username name Profilepic Bannerpic isVerified'
    );

    // Broadcast real-time reply creation to connected post room clients
    broadcastNewReply(postId, populatedReply);

    // Notifications
    const { createNotification, processMentions } = require('../services/notificationService');

    if (validatedParentId && parentDoc) {
      // Event 3: Reply interaction (replying to someone's reply)
      await createNotification({
        recipient: parentDoc.user,
        actor: req.user._id,
        type: 'reply_interaction',
        post: postId,
        reply: reply._id
      });
    } else {
      // Event 2: Direct reply to a post
      await createNotification({
        recipient: post.user,
        actor: req.user._id,
        type: 'reply',
        post: postId,
        reply: reply._id
      });
    }

    // Event 5: Mentions in reply content
    await processMentions({
      content,
      actorId: req.user._id,
      postId,
      replyId: reply._id
    });

    res.status(201).json({
      success: true,
      reply: populatedReply
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Update a reply owned by user
// @route   PATCH /api/replies/:id
// @access  Private
exports.updateReply = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { content } = req.body;

    if (!id || !/^[0-9a-fA-F]{24}$/.test(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid reply identifier.'
      });
    }

    if (!content || !content.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Reply content cannot be empty.'
      });
    }

    if (content.trim().length > 1500) {
      return res.status(400).json({
        success: false,
        message: 'Reply content cannot exceed 1500 characters.'
      });
    }

    const reply = await Reply.findById(id);
    if (!reply) {
      return res.status(404).json({
        success: false,
        message: 'Reply not found.'
      });
    }

    // Strict Authorization Check: Only author can edit reply
    if (reply.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Forbidden: You are not authorized to edit this reply.'
      });
    }

    reply.content = content.trim();
    await reply.save();

    const updatedReply = await Reply.findById(reply._id).populate(
      'user',
      'username name Profilepic Bannerpic isVerified'
    );

    // Broadcast real-time update
    broadcastUpdatedReply(reply.post, updatedReply);

    res.status(200).json({
      success: true,
      reply: updatedReply
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Delete a reply (Owner or Post Author)
// @route   DELETE /api/replies/:id
// @access  Private
exports.deleteReply = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!id || !/^[0-9a-fA-F]{24}$/.test(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid reply identifier.'
      });
    }

    const reply = await Reply.findById(id);
    if (!reply) {
      return res.status(404).json({
        success: false,
        message: 'Reply not found.'
      });
    }

    const isReplyAuthor = reply.user.toString() === req.user._id.toString();
    const post = await Post.findById(reply.post);
    const isPostAuthor = post && post.user.toString() === req.user._id.toString();

    // Security & Authorization Check
    if (!isReplyAuthor && !isPostAuthor) {
      return res.status(403).json({
        success: false,
        message: 'Forbidden: You are not authorized to delete this reply.'
      });
    }

    const postId = reply.post;

    // Iteratively collect all descendant reply IDs (children and grandchildren) to eliminate dangling references
    const toDeleteIds = [reply._id];
    let currentLevel = [reply._id];
    while (currentLevel.length > 0) {
      const children = await Reply.find({ parentReply: { $in: currentLevel } }).select('_id');
      if (children.length === 0) break;
      const childIds = children.map((c) => c._id);
      toDeleteIds.push(...childIds);
      currentLevel = childIds;
    }

    await Reply.deleteMany({ _id: { $in: toDeleteIds } });

    // Cascade delete any notifications referencing these deleted replies
    const Notification = require('../models/notification');
    await Notification.deleteMany({ reply: { $in: toDeleteIds } });

    // Broadcast real-time reply deletion
    broadcastDeletedReply(postId, reply._id);

    res.status(200).json({
      success: true,
      message: 'Reply deleted successfully.'
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Like a reply (Atomic & Idempotent PUT)
// @route   PUT /api/replies/:id/like
// @access  Private
exports.likeReply = async (req, res, next) => {
  try {
    const reply = await Reply.findByIdAndUpdate(
      req.params.id,
      { $addToSet: { likes: req.user._id } },
      { new: true }
    );

    if (!reply) {
      return res.status(404).json({
        success: false,
        message: 'Reply not found.'
      });
    }

    res.status(200).json({
      success: true,
      liked: true,
      likesCount: reply.likes.length,
      likes: reply.likes
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Unlike a reply (Atomic & Idempotent DELETE)
// @route   DELETE /api/replies/:id/like
// @access  Private
exports.unlikeReply = async (req, res, next) => {
  try {
    const reply = await Reply.findByIdAndUpdate(
      req.params.id,
      { $pull: { likes: req.user._id } },
      { new: true }
    );

    if (!reply) {
      return res.status(404).json({
        success: false,
        message: 'Reply not found.'
      });
    }

    res.status(200).json({
      success: true,
      liked: false,
      likesCount: reply.likes.length,
      likes: reply.likes
    });
  } catch (err) {
    next(err);
  }
};
