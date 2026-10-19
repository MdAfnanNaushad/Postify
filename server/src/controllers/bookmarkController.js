const mongoose = require('mongoose');
const Bookmark = require('../models/bookmark');
const Collection = require('../models/collection');
const Post = require('../models/post');

// @desc    Bookmark a post (Idempotent creation/assignment)
// @route   POST /api/bookmarks
// @access  Private
exports.bookmarkPost = async (req, res, next) => {
  try {
    const { postId, collectionId = null } = req.body;

    if (!postId || !mongoose.Types.ObjectId.isValid(postId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid post identifier.'
      });
    }

    // Verify post exists
    const post = await Post.findById(postId);
    if (!post) {
      return res.status(404).json({
        success: false,
        message: 'Post not found.'
      });
    }

    let targetCollectionId = null;
    if (collectionId) {
      if (!mongoose.Types.ObjectId.isValid(collectionId)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid collection identifier.'
        });
      }

      // Verify collection ownership
      const collection = await Collection.findOne({
        _id: collectionId,
        user: req.user._id
      });

      if (!collection) {
        return res.status(404).json({
          success: false,
          message: 'Collection not found or unauthorized.'
        });
      }
      targetCollectionId = collection._id;
    }

    // Atomic idempotent upsert to guarantee duplicate prevention under concurrent requests
    const updateOps = {
      $setOnInsert: {
        user: req.user._id,
        post: post._id,
        createdAt: new Date()
      }
    };

    if (targetCollectionId) {
      updateOps.$set = { collection: targetCollectionId };
    }

    const bookmark = await Bookmark.findOneAndUpdate(
      { user: req.user._id, post: post._id },
      updateOps,
      { upsert: true, new: true }
    );

    res.status(200).json({
      success: true,
      bookmarked: true,
      bookmark
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Remove a bookmark (Unbookmark)
// @route   DELETE /api/bookmarks/:postId
// @access  Private
exports.unbookmarkPost = async (req, res, next) => {
  try {
    const { postId } = req.params;

    if (!postId || !mongoose.Types.ObjectId.isValid(postId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid post identifier.'
      });
    }

    await Bookmark.findOneAndDelete({
      user: req.user._id,
      post: postId
    });

    res.status(200).json({
      success: true,
      bookmarked: false,
      message: 'Post removed from saved items.'
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Check whether a single post is bookmarked by current user
// @route   GET /api/bookmarks/check/:postId
// @access  Private
exports.checkBookmark = async (req, res, next) => {
  try {
    const { postId } = req.params;

    if (!postId || !mongoose.Types.ObjectId.isValid(postId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid post identifier.'
      });
    }

    const bookmark = await Bookmark.findOne({
      user: req.user._id,
      post: postId
    }).populate('collection', 'name');

    res.status(200).json({
      success: true,
      bookmarked: Boolean(bookmark),
      collection: bookmark?.collection || null
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Batch check bookmark statuses for efficient feed rendering
// @route   POST /api/bookmarks/check-batch
// @access  Private
exports.checkBatchBookmarks = async (req, res, next) => {
  try {
    const { postIds = [] } = req.body;

    if (!Array.isArray(postIds) || postIds.length === 0) {
      return res.status(200).json({
        success: true,
        bookmarkedPostIds: [],
        bookmarkMap: {}
      });
    }

    const validIds = postIds
      .filter((id) => id && mongoose.Types.ObjectId.isValid(id))
      .slice(0, 100);

    const bookmarks = await Bookmark.find({
      user: req.user._id,
      post: { $in: validIds }
    }).select('post collection');

    const bookmarkedPostIds = [];
    const bookmarkMap = {};

    bookmarks.forEach((b) => {
      const pid = b.post.toString();
      bookmarkedPostIds.push(pid);
      bookmarkMap[pid] = {
        bookmarked: true,
        collectionId: b.collection ? b.collection.toString() : null
      };
    });

    res.status(200).json({
      success: true,
      bookmarkedPostIds,
      bookmarkMap
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Get current user's bookmarks (Cursor-paginated, optional collection filter)
// @route   GET /api/bookmarks
// @access  Private
exports.getBookmarks = async (req, res, next) => {
  try {
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit, 10) || 20));
    const cursor = req.query.cursor ? new Date(req.query.cursor) : null;
    const { collectionId } = req.query;

    const query = { user: req.user._id };

    if (cursor && !isNaN(cursor.getTime())) {
      query.createdAt = { $lt: cursor };
    }

    if (collectionId) {
      if (collectionId === 'unassigned') {
        query.collection = null;
      } else if (mongoose.Types.ObjectId.isValid(collectionId)) {
        // Enforce private collection boundary
        const collection = await Collection.findOne({
          _id: collectionId,
          user: req.user._id
        });
        if (!collection) {
          return res.status(404).json({
            success: false,
            message: 'Collection not found or access denied.'
          });
        }
        query.collection = collection._id;
      } else {
        return res.status(400).json({
          success: false,
          message: 'Invalid collection identifier.'
        });
      }
    }

    const rawBookmarks = await Bookmark.find(query)
      .sort({ createdAt: -1 })
      .limit(limit + 1)
      .populate({
        path: 'post',
        populate: [
          { path: 'user', select: 'username name Profilepic Bannerpic isVerified' },
          { path: 'quotedPost', populate: { path: 'user', select: 'username name Profilepic Bannerpic isVerified' } }
        ]
      })
      .populate('collection', 'name description');

    // Handle deleted post reference gracefully: filter out null posts
    const validBookmarks = rawBookmarks.filter((b) => b.post != null);

    const hasMore = rawBookmarks.length > limit;
    const paginatedBookmarks = hasMore ? validBookmarks.slice(0, limit) : validBookmarks;
    const nextCursor =
      hasMore && paginatedBookmarks.length > 0
        ? paginatedBookmarks[paginatedBookmarks.length - 1].createdAt
        : null;

    res.status(200).json({
      success: true,
      bookmarks: paginatedBookmarks,
      pagination: {
        nextCursor,
        hasMore,
        count: paginatedBookmarks.length
      }
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Assign or move a bookmark between collections (or remove from collection without deleting bookmark)
// @route   PATCH /api/bookmarks/:postId/collection
// @access  Private
exports.updateBookmarkCollection = async (req, res, next) => {
  try {
    const { postId } = req.params;
    const { collectionId = null } = req.body;

    if (!postId || !mongoose.Types.ObjectId.isValid(postId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid post identifier.'
      });
    }

    const bookmark = await Bookmark.findOne({
      user: req.user._id,
      post: postId
    });

    if (!bookmark) {
      return res.status(404).json({
        success: false,
        message: 'Saved post not found.'
      });
    }

    let targetCollectionId = null;
    if (collectionId) {
      if (!mongoose.Types.ObjectId.isValid(collectionId)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid collection identifier.'
        });
      }

      const collection = await Collection.findOne({
        _id: collectionId,
        user: req.user._id
      });

      if (!collection) {
        return res.status(404).json({
          success: false,
          message: 'Collection not found or access denied.'
        });
      }
      targetCollectionId = collection._id;
    }

    bookmark.collection = targetCollectionId;
    await bookmark.save();

    const populatedBookmark = await Bookmark.findById(bookmark._id)
      .populate({
        path: 'post',
        populate: { path: 'user', select: 'username name Profilepic Bannerpic isVerified' }
      })
      .populate('collection', 'name description');

    res.status(200).json({
      success: true,
      bookmark: populatedBookmark
    });
  } catch (err) {
    next(err);
  }
};
