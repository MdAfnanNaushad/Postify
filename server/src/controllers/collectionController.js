const mongoose = require('mongoose');
const Collection = require('../models/collection');
const Bookmark = require('../models/bookmark');

function escapeRegex(text) {
  return text.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&');
}

// @desc    Create a private collection
// @route   POST /api/collections
// @access  Private
exports.createCollection = async (req, res, next) => {
  try {
    const { name, description = '' } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Collection name is required.'
      });
    }

    const trimmedName = name.trim();
    if (trimmedName.length > 60) {
      return res.status(400).json({
        success: false,
        message: 'Collection name cannot exceed 60 characters.'
      });
    }

    const trimmedDesc = String(description).trim();
    if (trimmedDesc.length > 300) {
      return res.status(400).json({
        success: false,
        message: 'Description cannot exceed 300 characters.'
      });
    }

    // Limit check: maximum 50 collections per user
    const existingCount = await Collection.countDocuments({ user: req.user._id });
    if (existingCount >= 50) {
      return res.status(400).json({
        success: false,
        message: 'You have reached the maximum limit of 50 collections.'
      });
    }

    // Duplicate check: case-insensitive unique collection name per user
    const duplicate = await Collection.findOne({
      user: req.user._id,
      name: new RegExp(`^${escapeRegex(trimmedName)}$`, 'i')
    });

    if (duplicate) {
      return res.status(400).json({
        success: false,
        message: 'A collection with this name already exists.'
      });
    }

    const collection = await Collection.create({
      user: req.user._id,
      name: trimmedName,
      description: trimmedDesc
    });

    res.status(201).json({
      success: true,
      collection: {
        ...collection.toObject(),
        bookmarkCount: 0
      }
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Get current user's collections with bookmark counts
// @route   GET /api/collections
// @access  Private
exports.getCollections = async (req, res, next) => {
  try {
    const [collections, countAgg, totalBookmarks] = await Promise.all([
      Collection.find({ user: req.user._id }).sort({ createdAt: -1 }),
      Bookmark.aggregate([
        { $match: { user: req.user._id, collection: { $ne: null } } },
        { $group: { _id: '$collection', count: { $sum: 1 } } }
      ]),
      Bookmark.countDocuments({ user: req.user._id })
    ]);

    const countMap = new Map();
    countAgg.forEach((c) => {
      countMap.set(c._id.toString(), c.count);
    });

    const collectionsWithCount = collections.map((col) => ({
      ...col.toObject(),
      bookmarkCount: countMap.get(col._id.toString()) || 0
    }));

    res.status(200).json({
      success: true,
      collections: collectionsWithCount,
      totalBookmarks
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Get single collection by ID
// @route   GET /api/collections/:id
// @access  Private
exports.getCollectionById = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid collection identifier.'
      });
    }

    const collection = await Collection.findById(id);
    if (!collection) {
      return res.status(404).json({
        success: false,
        message: 'Collection not found.'
      });
    }

    // Privacy & Security: enforce user ownership
    if (collection.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Forbidden: You do not have access to this private collection.'
      });
    }

    const bookmarkCount = await Bookmark.countDocuments({
      user: req.user._id,
      collection: collection._id
    });

    res.status(200).json({
      success: true,
      collection: {
        ...collection.toObject(),
        bookmarkCount
      }
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Update / rename collection
// @route   PATCH /api/collections/:id
// @access  Private
exports.updateCollection = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, description } = req.body;

    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid collection identifier.'
      });
    }

    const collection = await Collection.findById(id);
    if (!collection) {
      return res.status(404).json({
        success: false,
        message: 'Collection not found.'
      });
    }

    // Privacy & Security: verify ownership
    if (collection.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Forbidden: You are not authorized to update this collection.'
      });
    }

    if (name !== undefined) {
      const trimmedName = name.trim();
      if (!trimmedName) {
        return res.status(400).json({
          success: false,
          message: 'Collection name cannot be empty.'
        });
      }
      if (trimmedName.length > 60) {
        return res.status(400).json({
          success: false,
          message: 'Collection name cannot exceed 60 characters.'
        });
      }

      // Check duplicate name excluding current collection
      const duplicate = await Collection.findOne({
        _id: { $ne: collection._id },
        user: req.user._id,
        name: new RegExp(`^${escapeRegex(trimmedName)}$`, 'i')
      });

      if (duplicate) {
        return res.status(400).json({
          success: false,
          message: 'A collection with this name already exists.'
        });
      }

      collection.name = trimmedName;
    }

    if (description !== undefined) {
      const trimmedDesc = String(description).trim();
      if (trimmedDesc.length > 300) {
        return res.status(400).json({
          success: false,
          message: 'Description cannot exceed 300 characters.'
        });
      }
      collection.description = trimmedDesc;
    }

    collection.updatedAt = new Date();
    await collection.save();

    const bookmarkCount = await Bookmark.countDocuments({
      user: req.user._id,
      collection: collection._id
    });

    res.status(200).json({
      success: true,
      collection: {
        ...collection.toObject(),
        bookmarkCount
      }
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Delete a collection (Bookmarks are preserved and moved to general Saved view)
// @route   DELETE /api/collections/:id
// @access  Private
exports.deleteCollection = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid collection identifier.'
      });
    }

    const collection = await Collection.findById(id);
    if (!collection) {
      return res.status(404).json({
        success: false,
        message: 'Collection not found.'
      });
    }

    // Privacy & Security: verify ownership
    if (collection.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Forbidden: You are not authorized to delete this collection.'
      });
    }

    // Unassign bookmarks from this collection so they remain preserved in user's Saved view
    await Bookmark.updateMany(
      { user: req.user._id, collection: collection._id },
      { $set: { collection: null } }
    );

    await Collection.findByIdAndDelete(collection._id);

    res.status(200).json({
      success: true,
      message: 'Collection deleted successfully. Saved posts preserved in general Saved view.'
    });
  } catch (err) {
    next(err);
  }
};
