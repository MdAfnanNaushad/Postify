const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const { requireModerator, requireAdmin } = require('../middleware/roleMiddleware');
const {
  getReports,
  getReportById,
  actionReport,
  getAuditLogs
} = require('../controllers/moderationController');

// All moderation routes require authenticated user with appropriate role
router.use(protect);

// Moderator & Admin queue routes
router.get('/reports', requireModerator, getReports);
router.get('/reports/:id', requireModerator, getReportById);
router.patch('/reports/:id/action', requireModerator, actionReport);

// Admin only audit log route
router.get('/audit-logs', requireAdmin, getAuditLogs);

module.exports = router;
