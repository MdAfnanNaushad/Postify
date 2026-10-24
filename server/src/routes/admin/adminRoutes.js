const express = require('express');
const router = express.Router();
const { protect } = require('../../middleware/auth');
const { requireAdmin, adminLoginLimiter } = require('../../middleware/adminAuth');

// Controllers
const {
  adminLogin,
  adminLogout,
  getAdminSession,
  verifyAdminRoute
} = require('../../controllers/admin/adminAuthController');

const {
  getDashboardKpis,
  getLiveActivity
} = require('../../controllers/admin/adminDashboardController');

const {
  getCommunityGrowth,
  getContentCreation,
  getEngagementAnalytics,
  getModerationAnalytics,
  getTopPosts,
  getTopDevelopers,
  getHashtagAnalytics,
  getProjectAnalytics,
  getDigestAnalytics
} = require('../../controllers/admin/adminAnalyticsController');

const {
  getUsers,
  getUserById,
  updateUserSuspension,
  updateUserRole,
  updateUserBadge,
  getPosts,
  updatePostVisibility,
  getReplies,
  updateReplyVisibility,
  getProjects,
  updateProjectVisibility,
  getBuildLogs,
  updateBuildLogVisibility,
  getFollowMetrics
} = require('../../controllers/admin/adminCommunityController');

const {
  getReports,
  getReportById,
  actionReport,
  getAuditLogs,
  getSuspendedUsers,
  getHiddenContent
} = require('../../controllers/admin/adminTrustController');

const {
  getSystemHealth,
  getTrafficAnalytics,
  getBackgroundJobs,
  getEmailDeliveries,
  getConfigStatus
} = require('../../controllers/admin/adminSystemController');

// --- Public Admin Endpoints ---
router.post('/auth/login', adminLoginLimiter, adminLogin);
router.post('/auth/verify-route', verifyAdminRoute);

// --- Protected Admin Endpoints (Require valid admin session) ---
router.use(protect);
router.use(requireAdmin);

// Auth
router.post('/auth/logout', adminLogout);
router.get('/auth/session', getAdminSession);

// Dashboard & Live Activity
router.get('/dashboard', getDashboardKpis);
router.get('/activity', getLiveActivity);

// Analytics
router.get('/analytics/community', getCommunityGrowth);
router.get('/analytics/content', getContentCreation);
router.get('/analytics/engagement', getEngagementAnalytics);
router.get('/analytics/moderation', getModerationAnalytics);
router.get('/analytics/top-posts', getTopPosts);
router.get('/analytics/top-developers', getTopDevelopers);
router.get('/analytics/hashtags', getHashtagAnalytics);
router.get('/analytics/projects', getProjectAnalytics);
router.get('/analytics/digest', getDigestAnalytics);

// Community & Content Management
router.get('/users', getUsers);
router.get('/users/:id', getUserById);
router.patch('/users/:id/suspend', updateUserSuspension);
router.patch('/users/:id/role', updateUserRole);
router.patch('/users/:id/badge', updateUserBadge);

router.get('/posts', getPosts);
router.patch('/posts/:id/visibility', updatePostVisibility);

router.get('/replies', getReplies);
router.patch('/replies/:id/visibility', updateReplyVisibility);

router.get('/projects', getProjects);
router.patch('/projects/:id/visibility', updateProjectVisibility);

router.get('/build-logs', getBuildLogs);
router.patch('/build-logs/:id/visibility', updateBuildLogVisibility);

router.get('/follows', getFollowMetrics);

// Trust & Safety
router.get('/reports', getReports);
router.get('/reports/:id', getReportById);
router.patch('/reports/:id/action', actionReport);
router.get('/audit-logs', getAuditLogs);
router.get('/suspended-users', getSuspendedUsers);
router.get('/hidden-content', getHiddenContent);

// System & Operations
router.get('/system/health', getSystemHealth);
router.get('/system/traffic', getTrafficAnalytics);
router.get('/system/jobs', getBackgroundJobs);
router.get('/system/email-deliveries', getEmailDeliveries);
router.get('/system/config-status', getConfigStatus);

module.exports = router;
