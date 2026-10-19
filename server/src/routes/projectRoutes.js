const express = require('express');
const router = express.Router();
const { protect, optionalAuth } = require('../middleware/auth');
const {
  createProject,
  getProjects,
  getMyProjects,
  getProjectByIdOrSlug,
  updateProject,
  deleteProject
} = require('../controllers/projectController');
const {
  createLog,
  getProjectLogs,
  getLogById,
  updateLog,
  deleteLog
} = require('../controllers/buildLogController');

const { projectLimiter } = require('../middleware/rateLimiter');

// Project Collection Routes
router.route('/')
  .post(protect, projectLimiter, createProject)
  .get(getProjects);

router.get('/my', protect, getMyProjects);

// Scoped Username + Slug Project Routes: /api/projects/user/:username/:slug
router.route('/user/:username/:slug')
  .get(optionalAuth, getProjectByIdOrSlug)
  .put(protect, projectLimiter, updateProject)
  .patch(protect, projectLimiter, updateProject)
  .delete(protect, deleteProject);

router.route('/user/:username/:slug/logs')
  .post(protect, projectLimiter, createLog)
  .get(optionalAuth, getProjectLogs);

router.route('/user/:username/:slug/logs/:logId')
  .get(optionalAuth, getLogById)
  .put(protect, updateLog)
  .patch(protect, updateLog)
  .delete(protect, deleteLog);

// Backward-compatible ID / Slug Project Build Log Routes
router.route('/:projectIdOrSlug/logs')
  .post(protect, createLog)
  .get(optionalAuth, getProjectLogs);

router.route('/:projectIdOrSlug/logs/:logId')
  .get(optionalAuth, getLogById)
  .put(protect, updateLog)
  .patch(protect, updateLog)
  .delete(protect, deleteLog);

// Backward-compatible ID / Slug Single Project Route
router.route('/:idOrSlug')
  .get(optionalAuth, getProjectByIdOrSlug)
  .put(protect, updateProject)
  .patch(protect, updateProject)
  .delete(protect, deleteProject);

module.exports = router;
