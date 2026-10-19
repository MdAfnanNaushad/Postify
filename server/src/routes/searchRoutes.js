const express = require('express');
const router = express.Router();
const { search } = require('../controllers/searchController');
const { searchLimiter } = require('../middleware/rateLimiter');

router.get('/', searchLimiter, search);

module.exports = router;
