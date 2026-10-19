const express = require('express');
const router = express.Router();
const {
  updateReply,
  deleteReply,
  likeReply,
  unlikeReply
} = require('../controllers/replyController');
const { protect } = require('../middleware/auth');
const { likeLimiter } = require('../middleware/rateLimiter');

router.patch('/:id', protect, updateReply);
router.delete('/:id', protect, deleteReply);
router.put('/:id/like', protect, likeLimiter, likeReply);
router.delete('/:id/like', protect, likeLimiter, unlikeReply);

module.exports = router;
