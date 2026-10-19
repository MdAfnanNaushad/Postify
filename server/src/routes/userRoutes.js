const express = require('express');
const router = express.Router();
const {
  getUserById,
  updateMe,
  updateAvatar,
  updateBanner,
  pinPost,
  unpinPost
} = require('../controllers/userController');
const { followUser, unfollowUser, getFollowers, getFollowing } = require('../controllers/followController');
const { getUserProjects } = require('../controllers/projectController');
const { protect, optionalAuth } = require('../middleware/auth');
const upload = require('../middleware/upload');
const { followLimiter, uploadLimiter } = require('../middleware/rateLimiter');

// Authenticated current user profile actions (/me/*)
router.patch('/me', protect, updateMe);
router.put('/me', protect, updateMe);
router.post('/me/avatar', protect, uploadLimiter, upload.single('profilepic'), updateAvatar);
router.post('/me/banner', protect, uploadLimiter, upload.single('bannerpic'), updateBanner);
router.post('/me/pins/:postId', protect, pinPost);
router.delete('/me/pins/:postId', protect, unpinPost);

// Follow / Unfollow endpoints
router.post('/:id/follow', protect, followLimiter, followUser);
router.delete('/:id/follow', protect, followLimiter, unfollowUser);
router.get('/:id/followers', getFollowers);
router.get('/:id/following', getFollowing);

// Public user profile lookup
router.get('/:id', getUserById);

// User dedicated projects
router.get('/:userId/projects', optionalAuth, getUserProjects);

module.exports = router;
