const mongoose = require('mongoose');
const Project = require('../models/project');
const BuildLog = require('../models/buildLog');
const User = require('../models/user');

/**
 * Helper to generate URL-safe slug from project name
 */
function slugify(text) {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-') // Replace spaces with -
    .replace(/[^\w-]+/g, '') // Remove all non-word chars
    .replace(/--+/g, '-') // Replace multiple - with single -
    .slice(0, 100);
}

/**
 * Validates that URL uses http or https protocol
 */
function isValidProtocol(url) {
  if (!url || typeof url !== 'string' || !url.trim()) return true;
  return /^https?:\/\//i.test(url.trim());
}

// @desc    Create new project
// @route   POST /api/projects
// @access  Private
exports.createProject = async (req, res, next) => {
  try {
    const {
      name,
      shortDescription,
      description,
      techStack,
      repositoryUrl,
      liveUrl,
      coverImage,
      status,
      visibility,
      startedAt,
      completedAt
    } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Project name is required.'
      });
    }

    if (name.trim().length > 100) {
      return res.status(400).json({
        success: false,
        message: 'Project name cannot exceed 100 characters.'
      });
    }

    if (shortDescription && shortDescription.trim().length > 300) {
      return res.status(400).json({
        success: false,
        message: 'Short description cannot exceed 300 characters.'
      });
    }

    if (description && description.trim().length > 5000) {
      return res.status(400).json({
        success: false,
        message: 'Detailed description cannot exceed 5000 characters.'
      });
    }

    if (!isValidProtocol(repositoryUrl)) {
      return res.status(400).json({
        success: false,
        message: 'Repository URL must start with http:// or https://'
      });
    }

    if (!isValidProtocol(liveUrl)) {
      return res.status(400).json({
        success: false,
        message: 'Live website URL must start with http:// or https://'
      });
    }

    const allowedStatuses = ['planned', 'in_progress', 'paused', 'completed', 'archived'];
    if (status && !allowedStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid project status. Allowed values: planned, in_progress, paused, completed, archived.'
      });
    }

    const allowedVisibilities = ['public', 'private'];
    if (visibility && !allowedVisibilities.includes(visibility)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid visibility value. Allowed values: public, private.'
      });
    }

    // Normalized techStack
    let normalizedTechStack = [];
    if (Array.isArray(techStack)) {
      normalizedTechStack = [
        ...new Set(
          techStack
            .filter((t) => typeof t === 'string' && t.trim())
            .map((t) => t.trim().slice(0, 40))
        )
      ].slice(0, 20);
    }

    // Slug generation with collision resolution for this owner
    let baseSlug = slugify(name);
    if (!baseSlug) baseSlug = 'project';
    let slug = baseSlug;
    let count = 1;
    while (await Project.findOne({ owner: req.user._id, slug })) {
      slug = `${baseSlug}-${count}`;
      count++;
    }

    const project = await Project.create({
      owner: req.user._id,
      name: name.trim(),
      slug,
      shortDescription: shortDescription ? shortDescription.trim() : '',
      description: description ? description.trim() : '',
      techStack: normalizedTechStack,
      repositoryUrl: repositoryUrl ? repositoryUrl.trim() : '',
      liveUrl: liveUrl ? liveUrl.trim() : '',
      coverImage: coverImage ? coverImage.trim() : '',
      status: ['planned', 'in_progress', 'paused', 'completed', 'archived'].includes(status)
        ? status
        : 'in_progress',
      visibility: visibility === 'private' ? 'private' : 'public',
      startedAt: startedAt ? new Date(startedAt) : null,
      completedAt: completedAt ? new Date(completedAt) : null
    });

    const populatedProject = await Project.findById(project._id).populate(
      'owner',
      'username name Profilepic profilePic isVerified'
    );

    res.status(201).json({
      success: true,
      project: populatedProject
    });
  } catch (err) {
    next(err);
  }
};

// @desc    List public projects (with search & tech filters)
// @route   GET /api/projects
// @access  Public
exports.getProjects = async (req, res, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit, 10) || 12));
    const skip = (page - 1) * limit;

    const filter = { visibility: 'public' };

    if (req.query.status && ['planned', 'in_progress', 'paused', 'completed', 'archived'].includes(req.query.status)) {
      filter.status = req.query.status;
    }

    if (req.query.tech && req.query.tech.trim()) {
      filter.techStack = { $regex: new RegExp(`^${req.query.tech.trim()}$`, 'i') };
    }

    if (req.query.search && req.query.search.trim()) {
      const q = req.query.search.trim().replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&');
      filter.$or = [
        { name: new RegExp(q, 'i') },
        { shortDescription: new RegExp(q, 'i') },
        { description: new RegExp(q, 'i') },
        { techStack: new RegExp(q, 'i') }
      ];
    }

    filter.isHidden = { $ne: true };

    const [total, projects] = await Promise.all([
      Project.countDocuments(filter),
      Project.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('owner', 'username name Profilepic profilePic isVerified')
        .lean()
    ]);

    // Attach buildLogCount for each project
    const projectIds = projects.map((p) => p._id);
    const logCounts = await BuildLog.aggregate([
      { $match: { project: { $in: projectIds } } },
      { $group: { _id: '$project', count: { $sum: 1 } } }
    ]);
    const logCountMap = logCounts.reduce((acc, curr) => {
      acc[curr._id.toString()] = curr.count;
      return acc;
    }, {});

    const enrichedProjects = projects.map((p) => ({
      ...p,
      buildLogCount: logCountMap[p._id.toString()] || 0
    }));

    res.status(200).json({
      success: true,
      projects: enrichedProjects,
      total,
      page,
      pages: Math.ceil(total / limit)
    });
  } catch (err) {
    next(err);
  }
};

// @desc    List authenticated user's projects (public and private)
// @route   GET /api/projects/my
// @access  Private
exports.getMyProjects = async (req, res, next) => {
  try {
    const projects = await Project.find({ owner: req.user._id })
      .sort({ createdAt: -1 })
      .populate('owner', 'username name Profilepic profilePic isVerified')
      .lean();

    const projectIds = projects.map((p) => p._id);
    const logCounts = await BuildLog.aggregate([
      { $match: { project: { $in: projectIds } } },
      { $group: { _id: '$project', count: { $sum: 1 } } }
    ]);
    const logCountMap = logCounts.reduce((acc, curr) => {
      acc[curr._id.toString()] = curr.count;
      return acc;
    }, {});

    const enriched = projects.map((p) => ({
      ...p,
      buildLogCount: logCountMap[p._id.toString()] || 0
    }));

    res.status(200).json({
      success: true,
      projects: enriched
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Helper to find project for mutations (update, delete) with owner scoping
 */
async function findProjectForMutation(params, reqUser) {
  const { idOrSlug, id, username, slug } = params;
  const target = idOrSlug || id;

  if (username && slug) {
    const ownerUser = await User.findOne({ username: username.toLowerCase() });
    if (!ownerUser) return null;
    return await Project.findOne({ owner: ownerUser._id, slug: slug.toLowerCase() });
  }

  if (mongoose.isValidObjectId(target)) {
    return await Project.findById(target);
  }

  if (target) {
    // If target is slug, resolve with owner scoping to avoid collisions
    return await Project.findOne({ owner: reqUser._id, slug: target.toLowerCase() });
  }

  return null;
}

// @desc    Get project by ID or slug (and optional username)
// @route   GET /api/projects/:idOrSlug
// @route   GET /api/projects/user/:username/:slug
// @access  Public / Authenticated
exports.getProjectByIdOrSlug = async (req, res, next) => {
  try {
    const { idOrSlug, username, slug } = req.params;
    let project = null;

    if (username && slug) {
      // Scoped resolution: look up by owner username + slug
      const ownerUser = await User.findOne({ username: username.toLowerCase() });
      if (!ownerUser) {
        return res.status(404).json({
          success: false,
          message: 'Project not found.'
        });
      }
      project = await Project.findOne({ owner: ownerUser._id, slug: slug.toLowerCase() })
        .populate('owner', 'username name Profilepic profilePic isVerified bio')
        .lean();
    } else if (mongoose.isValidObjectId(idOrSlug)) {
      // Direct lookup by unique ObjectId
      project = await Project.findById(idOrSlug)
        .populate('owner', 'username name Profilepic profilePic isVerified bio')
        .lean();
    } else if (idOrSlug) {
      const cleanSlug = idOrSlug.toLowerCase();
      // If user is authenticated, check if they own a project with this slug first
      if (req.user) {
        project = await Project.findOne({ owner: req.user._id, slug: cleanSlug })
          .populate('owner', 'username name Profilepic profilePic isVerified bio')
          .lean();
      }
      // If not found yet, check public projects with this slug
      if (!project) {
        const matchingProjects = await Project.find({ slug: cleanSlug })
          .populate('owner', 'username name Profilepic profilePic isVerified bio')
          .lean();

        if (matchingProjects.length === 1) {
          project = matchingProjects[0];
        } else if (matchingProjects.length > 1) {
          const publicOnes = matchingProjects.filter((p) => p.visibility === 'public');
          project = publicOnes[0] || matchingProjects[0];
        }
      }
    }

    if (!project) {
      return res.status(404).json({
        success: false,
        message: 'Project not found.'
      });
    }

    // Privacy boundary enforcement:
    if (project.visibility === 'private') {
      const requesterId = req.user?._id?.toString() || req.user?.id?.toString();
      const ownerId = (project.owner?._id || project.owner)?.toString();

      if (!requesterId || requesterId !== ownerId) {
        return res.status(403).json({
          success: false,
          message: 'Project not found or private.'
        });
      }
    }

    if (project.isHidden && (!req.user || (req.user.role !== 'moderator' && req.user.role !== 'admin'))) {
      return res.status(404).json({
        success: false,
        message: 'Project not found or unavailable.'
      });
    }

    const buildLogCount = await BuildLog.countDocuments({ project: project._id });

    res.status(200).json({
      success: true,
      project: {
        ...project,
        buildLogCount
      }
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Update project details
// @route   PUT / PATCH /api/projects/:idOrSlug
// @route   PUT / PATCH /api/projects/user/:username/:slug
// @access  Private
exports.updateProject = async (req, res, next) => {
  try {
    const project = await findProjectForMutation(req.params, req.user);
    if (!project) {
      return res.status(404).json({
        success: false,
        message: 'Project not found.'
      });
    }

    if (project.owner.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'You are not authorized to edit this project.'
      });
    }

    const {
      name,
      slug,
      shortDescription,
      description,
      techStack,
      repositoryUrl,
      liveUrl,
      coverImage,
      status,
      visibility,
      startedAt,
      completedAt
    } = req.body;

    if (name && name.trim()) {
      if (name.trim().length > 100) {
        return res.status(400).json({
          success: false,
          message: 'Project name cannot exceed 100 characters.'
        });
      }
      project.name = name.trim();
    }

    if (slug && slug.trim()) {
      const cleanSlug = slugify(slug);
      // Check if another project by this owner uses this slug
      const existing = await Project.findOne({
        owner: req.user._id,
        slug: cleanSlug,
        _id: { $ne: project._id }
      });
      if (existing) {
        return res.status(400).json({
          success: false,
          message: 'A project with this URL slug already exists in your workspace.'
        });
      }
      project.slug = cleanSlug;
    }

    if (shortDescription !== undefined) {
      if (shortDescription.trim().length > 300) {
        return res.status(400).json({
          success: false,
          message: 'Short description cannot exceed 300 characters.'
        });
      }
      project.shortDescription = shortDescription.trim();
    }

    if (description !== undefined) {
      if (description.trim().length > 5000) {
        return res.status(400).json({
          success: false,
          message: 'Detailed description cannot exceed 5000 characters.'
        });
      }
      project.description = description.trim();
    }

    if (repositoryUrl !== undefined) {
      if (!isValidProtocol(repositoryUrl)) {
        return res.status(400).json({
          success: false,
          message: 'Repository URL must start with http:// or https://'
        });
      }
      project.repositoryUrl = repositoryUrl.trim();
    }

    if (liveUrl !== undefined) {
      if (!isValidProtocol(liveUrl)) {
        return res.status(400).json({
          success: false,
          message: 'Live website URL must start with http:// or https://'
        });
      }
      project.liveUrl = liveUrl.trim();
    }

    if (coverImage !== undefined) {
      project.coverImage = coverImage.trim();
    }

    if (status !== undefined) {
      const allowedStatuses = ['planned', 'in_progress', 'paused', 'completed', 'archived'];
      if (!allowedStatuses.includes(status)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid project status. Allowed values: planned, in_progress, paused, completed, archived.'
        });
      }
      project.status = status;
    }

    if (visibility !== undefined) {
      const allowedVisibilities = ['public', 'private'];
      if (!allowedVisibilities.includes(visibility)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid visibility value. Allowed values: public, private.'
        });
      }
      project.visibility = visibility;
    }

    if (techStack && Array.isArray(techStack)) {
      project.techStack = [
        ...new Set(
          techStack
            .filter((t) => typeof t === 'string' && t.trim())
            .map((t) => t.trim().slice(0, 40))
        )
      ].slice(0, 20);
    }

    if (startedAt !== undefined) {
      project.startedAt = startedAt ? new Date(startedAt) : null;
    }

    if (completedAt !== undefined) {
      project.completedAt = completedAt ? new Date(completedAt) : null;
    }

    await project.save();

    const updated = await Project.findById(project._id).populate(
      'owner',
      'username name Profilepic profilePic isVerified'
    );

    res.status(200).json({
      success: true,
      project: updated
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Delete project and cascade delete all its build logs
// @route   DELETE /api/projects/:idOrSlug
// @route   DELETE /api/projects/user/:username/:slug
// @access  Private
exports.deleteProject = async (req, res, next) => {
  try {
    const project = await findProjectForMutation(req.params, req.user);
    if (!project) {
      return res.status(404).json({
        success: false,
        message: 'Project not found.'
      });
    }

    if (project.owner.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'You are not authorized to delete this project.'
      });
    }

    // Step 1: Hide project immediately to isolate from public discovery
    project.visibility = 'private';
    await project.save();

    // Step 2: Delete associated build logs
    await BuildLog.deleteMany({ project: project._id });

    // Step 3: Delete project document
    await Project.findByIdAndDelete(project._id);

    res.status(200).json({
      success: true,
      message: 'Project and associated build logs deleted successfully.'
    });
  } catch (err) {
    next(err);
  }
};

// @desc    List projects for a specific user (public only for guests/others)
// @route   GET /api/users/:userId/projects
// @access  Public / Authenticated
exports.getUserProjects = async (req, res, next) => {
  try {
    const { userId } = req.params;
    let targetUser;

    if (mongoose.isValidObjectId(userId)) {
      targetUser = await User.findById(userId).select('_id username name');
    } else {
      targetUser = await User.findOne({ username: userId }).select('_id username name');
    }

    if (!targetUser) {
      return res.status(404).json({
        success: false,
        message: 'User not found.'
      });
    }

    const requesterId = req.user?._id?.toString() || req.user?.id?.toString();
    const isOwner = requesterId === targetUser._id.toString();

    const query = {
      owner: targetUser._id
    };

    if (!isOwner) {
      query.visibility = 'public';
    }

    const projects = await Project.find(query)
      .sort({ createdAt: -1 })
      .populate('owner', 'username name Profilepic profilePic isVerified')
      .lean();

    const projectIds = projects.map((p) => p._id);
    const logCounts = await BuildLog.aggregate([
      { $match: { project: { $in: projectIds } } },
      { $group: { _id: '$project', count: { $sum: 1 } } }
    ]);
    const logCountMap = logCounts.reduce((acc, curr) => {
      acc[curr._id.toString()] = curr.count;
      return acc;
    }, {});

    const enriched = projects.map((p) => ({
      ...p,
      buildLogCount: logCountMap[p._id.toString()] || 0
    }));

    res.status(200).json({
      success: true,
      projects: enriched
    });
  } catch (err) {
    next(err);
  }
};
