const mongoose = require('mongoose');
const Project = require('../models/project');
const BuildLog = require('../models/buildLog');
const User = require('../models/user');

/**
 * Helper to resolve project by ID, slug, or username+slug, and enforce visibility
 */
async function resolveProjectAndCheckVisibility(params, reqUser) {
  const target = typeof params === 'string' ? params : (params.projectIdOrSlug || params.projectId || params.idOrSlug || params.id);
  const username = typeof params === 'object' ? params.username : null;
  const slug = typeof params === 'object' ? params.slug : null;

  let project = null;

  if (username && slug) {
    const ownerUser = await User.findOne({ username: username.toLowerCase() });
    if (!ownerUser) {
      return { error: { status: 404, message: 'Project owner not found.' } };
    }
    project = await Project.findOne({ owner: ownerUser._id, slug: slug.toLowerCase() });
  } else if (mongoose.isValidObjectId(target)) {
    project = await Project.findById(target);
  } else if (target) {
    const cleanSlug = target.toLowerCase();
    // Prioritize project owned by reqUser if authenticated
    if (reqUser) {
      project = await Project.findOne({ owner: reqUser._id, slug: cleanSlug });
    }
    if (!project) {
      const candidates = await Project.find({ slug: cleanSlug });
      if (candidates.length === 1) {
        project = candidates[0];
      } else if (candidates.length > 1) {
        const publicCandidates = candidates.filter((p) => p.visibility === 'public');
        project = publicCandidates[0] || candidates[0];
      }
    }
  }

  if (!project) {
    return { error: { status: 404, message: 'Project not found.' } };
  }

  if (project.visibility === 'private') {
    const requesterId = reqUser?._id?.toString() || reqUser?.id?.toString();
    const ownerId = project.owner.toString();

    if (!requesterId || requesterId !== ownerId) {
      return { error: { status: 403, message: 'Project not found or private.' } };
    }
  }

  return { project };
}

// @desc    Create a new build log entry for a project
// @route   POST /api/projects/:projectIdOrSlug/logs
// @route   POST /api/projects/user/:username/:slug/logs
// @access  Private
exports.createLog = async (req, res, next) => {
  try {
    const { project, error } = await resolveProjectAndCheckVisibility(req.params, req.user);

    if (error) {
      return res.status(error.status).json({
        success: false,
        message: error.message
      });
    }

    if (project.owner.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Only the project owner can create build logs for this project.'
      });
    }

    const { title, content, entryType, tags, media, isPinned } = req.body;

    if (!title || !title.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Build log title is required.'
      });
    }

    if (title.trim().length > 150) {
      return res.status(400).json({
        success: false,
        message: 'Title cannot exceed 150 characters.'
      });
    }

    if (!content || !content.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Build log content is required.'
      });
    }

    if (content.trim().length > 15000) {
      return res.status(400).json({
        success: false,
        message: 'Content cannot exceed 15000 characters.'
      });
    }

    const validEntryTypes = ['milestone', 'feature', 'fix', 'refactor', 'research', 'release', 'note'];
    if (entryType && !validEntryTypes.includes(entryType)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid entryType. Allowed values: milestone, feature, fix, refactor, research, release, note.'
      });
    }
    const chosenType = entryType || 'feature';

    let normalizedTags = [];
    if (Array.isArray(tags)) {
      normalizedTags = [
        ...new Set(
          tags
            .filter((t) => typeof t === 'string' && t.trim())
            .map((t) => t.trim().toLowerCase().slice(0, 40))
        )
      ].slice(0, 15);
    }

    const log = await BuildLog.create({
      project: project._id,
      author: req.user._id,
      title: title.trim(),
      content: content.trim(),
      entryType: chosenType,
      tags: normalizedTags,
      media: Array.isArray(media) ? media.filter(Boolean) : [],
      isPinned: Boolean(isPinned)
    });

    const populated = await BuildLog.findById(log._id)
      .populate('author', 'username name Profilepic profilePic isVerified')
      .populate('project', 'name slug visibility');

    res.status(201).json({
      success: true,
      log: populated
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Get chronological build logs for an accessible project
// @route   GET /api/projects/:projectIdOrSlug/logs
// @route   GET /api/projects/user/:username/:slug/logs
// @access  Public / Authenticated
exports.getProjectLogs = async (req, res, next) => {
  try {
    const { project, error } = await resolveProjectAndCheckVisibility(req.params, req.user);

    if (error) {
      return res.status(error.status).json({
        success: false,
        message: error.message
      });
    }

    const order = req.query.order === 'desc' ? -1 : 1;
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit, 10) || 30));
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const skip = (page - 1) * limit;

    const filter = { project: project._id, isHidden: { $ne: true } };

    if (req.query.entryType && ['milestone', 'feature', 'fix', 'refactor', 'research', 'release', 'note'].includes(req.query.entryType)) {
      filter.entryType = req.query.entryType;
    }

    if (req.query.tag && req.query.tag.trim()) {
      filter.tags = req.query.tag.trim().toLowerCase();
    }

    const [total, logs] = await Promise.all([
      BuildLog.countDocuments(filter),
      BuildLog.find(filter)
        .sort({ isPinned: -1, createdAt: order, _id: order })
        .skip(skip)
        .limit(limit)
        .populate('author', 'username name Profilepic profilePic isVerified')
        .lean()
    ]);

    res.status(200).json({
      success: true,
      project: {
        _id: project._id,
        name: project.name,
        slug: project.slug,
        visibility: project.visibility
      },
      logs,
      total,
      page,
      pages: Math.ceil(total / limit),
      hasMore: page * limit < total
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Get single build log by ID
// @route   GET /api/projects/:projectIdOrSlug/logs/:logId
// @route   GET /api/projects/user/:username/:slug/logs/:logId
// @access  Public / Authenticated
exports.getLogById = async (req, res, next) => {
  try {
    const { logId } = req.params;
    const { project, error } = await resolveProjectAndCheckVisibility(req.params, req.user);

    if (error) {
      return res.status(error.status).json({
        success: false,
        message: error.message
      });
    }

    if (!mongoose.isValidObjectId(logId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid log ID format.'
      });
    }

    const log = await BuildLog.findOne({ _id: logId, project: project._id })
      .populate('author', 'username name Profilepic profilePic isVerified')
      .populate('project', 'name slug visibility owner')
      .lean();

    if (!log || (log.isHidden && (!req.user || (req.user.role !== 'moderator' && req.user.role !== 'admin')))) {
      return res.status(404).json({
        success: false,
        message: 'Build log not found.'
      });
    }

    res.status(200).json({
      success: true,
      log,
      project
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Update build log entry
// @route   PUT / PATCH /api/projects/:projectIdOrSlug/logs/:logId
// @route   PUT / PATCH /api/projects/user/:username/:slug/logs/:logId
// @access  Private
exports.updateLog = async (req, res, next) => {
  try {
    const { logId } = req.params;

    if (!mongoose.isValidObjectId(logId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid log ID format.'
      });
    }

    const { project, error } = await resolveProjectAndCheckVisibility(req.params, req.user);
    if (error) {
      return res.status(error.status).json({
        success: false,
        message: error.message
      });
    }

    const log = await BuildLog.findOne({ _id: logId, project: project._id });
    if (!log) {
      return res.status(404).json({
        success: false,
        message: 'Build log not found.'
      });
    }

    if (log.author.toString() !== req.user._id.toString() && project.owner.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'You are not authorized to update this build log.'
      });
    }

    const { title, content, entryType, tags, media, isPinned } = req.body;

    if (title && title.trim()) {
      if (title.trim().length > 150) {
        return res.status(400).json({
          success: false,
          message: 'Title cannot exceed 150 characters.'
        });
      }
      log.title = title.trim();
    }

    if (content && content.trim()) {
      if (content.trim().length > 15000) {
        return res.status(400).json({
          success: false,
          message: 'Content cannot exceed 15000 characters.'
        });
      }
      log.content = content.trim();
    }

    if (entryType !== undefined) {
      const validEntryTypes = ['milestone', 'feature', 'fix', 'refactor', 'research', 'release', 'note'];
      if (!validEntryTypes.includes(entryType)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid entryType. Allowed values: milestone, feature, fix, refactor, research, release, note.'
        });
      }
      log.entryType = entryType;
    }

    if (tags && Array.isArray(tags)) {
      log.tags = [
        ...new Set(
          tags
            .filter((t) => typeof t === 'string' && t.trim())
            .map((t) => t.trim().toLowerCase().slice(0, 40))
        )
      ].slice(0, 15);
    }

    if (media !== undefined && Array.isArray(media)) {
      log.media = media.filter(Boolean);
    }

    if (isPinned !== undefined) {
      log.isPinned = Boolean(isPinned);
    }

    await log.save();

    const updated = await BuildLog.findById(log._id)
      .populate('author', 'username name Profilepic profilePic isVerified')
      .populate('project', 'name slug visibility');

    res.status(200).json({
      success: true,
      log: updated
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Delete build log entry
// @route   DELETE /api/projects/:projectIdOrSlug/logs/:logId
// @route   DELETE /api/projects/user/:username/:slug/logs/:logId
// @access  Private
exports.deleteLog = async (req, res, next) => {
  try {
    const { logId } = req.params;

    if (!mongoose.isValidObjectId(logId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid log ID format.'
      });
    }

    const { project, error } = await resolveProjectAndCheckVisibility(req.params, req.user);
    if (error) {
      return res.status(error.status).json({
        success: false,
        message: error.message
      });
    }

    const log = await BuildLog.findOne({ _id: logId, project: project._id });
    if (!log) {
      return res.status(404).json({
        success: false,
        message: 'Build log not found.'
      });
    }

    if (log.author.toString() !== req.user._id.toString() && project.owner.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'You are not authorized to delete this build log.'
      });
    }

    await BuildLog.findByIdAndDelete(log._id);

    res.status(200).json({
      success: true,
      message: 'Build log deleted successfully.'
    });
  } catch (err) {
    next(err);
  }
};
