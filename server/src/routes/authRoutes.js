const express = require('express');
const router = express.Router();
const { register, login, getMe, logout } = require('../controllers/authController');
const { protect } = require('../middleware/auth');
const upload = require('../middleware/upload');
const { authLimiter } = require('../middleware/rateLimiter');

router.post('/register', authLimiter, upload.single('profilepic'), register);
router.post('/login', authLimiter, login);
router.get('/me', protect, getMe);
router.post('/logout', logout);

module.exports = router;
