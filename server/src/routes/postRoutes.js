const express = require('express');
const router = express.Router();
const {
  getPosts,
  getPostById,
  getPostSocialPreview,
  createPost,
  updatePost,
  deletePost,
  likePost,
  unlikePost,
  repostPost,
  undoRepost,
  getFollowingFeed
} = require('../controllers/postController');
const { protect } = require('../middleware/auth');
const { likeLimiter, replyLimiter, createPostLimiter, repostLimiter } = require('../middleware/rateLimiter');
const {
  getRepliesForPost,
  createReply
} = require('../controllers/replyController');

router.get('/', getPosts);
router.get('/following', protect, getFollowingFeed);
router.get('/:id', getPostById);
router.get('/:id/preview', getPostSocialPreview);
router.post('/', protect, createPostLimiter, createPost);
router.patch('/:id', protect, createPostLimiter, updatePost);
router.delete('/:id', protect, deletePost);

// RESTful like and unlike operations with rate-limiting abuse defense
router.put('/:id/like', protect, likeLimiter, likePost);
router.delete('/:id/like', protect, likeLimiter, unlikePost);

// Repost & Undo-Repost endpoints
router.post('/:id/repost', protect, repostLimiter, repostPost);
router.delete('/:id/repost', protect, repostLimiter, undoRepost);

// Threaded Discussion Replies Routes
router.get('/:postId/replies', getRepliesForPost);
router.post('/:postId/replies', protect, replyLimiter, createReply);

module.exports = router;
