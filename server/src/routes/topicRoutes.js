const express = require('express');
const router = express.Router();
const { getTopics, getTopicPosts } = require('../controllers/topicController');

router.get('/', getTopics);
router.get('/:tag', getTopicPosts);

module.exports = router;
