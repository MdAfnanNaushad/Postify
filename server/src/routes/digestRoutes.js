const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const {
  getCurrentDigest,
  getDigestHistory,
  getDigestByPeriod,
  markDigestAsRead,
  getDigestPreferences,
  updateDigestPreferences,
  generateDigestManually
} = require('../controllers/digestController');

const { digestLimiter } = require('../middleware/rateLimiter');

// All digest routes require authentication
router.use(protect);

router.get('/current', getCurrentDigest);
router.get('/history', getDigestHistory);
router.get('/preferences', getDigestPreferences);
router.put('/preferences', updateDigestPreferences);
router.post('/generate', digestLimiter, generateDigestManually);
router.patch('/:digestId/read', markDigestAsRead);
router.get('/:periodKey', getDigestByPeriod);

module.exports = router;
