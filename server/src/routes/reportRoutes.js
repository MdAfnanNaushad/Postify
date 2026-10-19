const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const { reportLimiter } = require('../middleware/rateLimiter');
const { createReport } = require('../controllers/moderationController');

// Submit content or user report
router.post('/', protect, reportLimiter, createReport);

module.exports = router;
