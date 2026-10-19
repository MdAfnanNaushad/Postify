const express = require('express');
const router = express.Router();
const {
  bookmarkPost,
  unbookmarkPost,
  checkBookmark,
  checkBatchBookmarks,
  getBookmarks,
  updateBookmarkCollection
} = require('../controllers/bookmarkController');
const { protect } = require('../middleware/auth');

router.use(protect); // All bookmark endpoints require verified authentication

router.post('/', bookmarkPost);
router.get('/', getBookmarks);
router.post('/check-batch', checkBatchBookmarks);
router.get('/check/:postId', checkBookmark);
router.patch('/:postId/collection', updateBookmarkCollection);
router.delete('/:postId', unbookmarkPost);

module.exports = router;
