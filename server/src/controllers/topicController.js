const Post = require('../models/post');

// @desc    Get aggregated topics/hashtags with post counts
// @route   GET /api/topics
// @access  Public
exports.getTopics = async (req, res, next) => {
  try {
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 30));

    const topics = await Post.aggregate([
      { $match: { isHidden: { $ne: true } } },
      { $unwind: '$tags' },
      {
        $group: {
          _id: '$tags',
          count: { $sum: 1 },
          latestPostDate: { $max: '$date' }
        }
      },
      { $sort: { count: -1, latestPostDate: -1 } },
      { $limit: limit },
      {
        $project: {
          _id: 0,
          tag: '$_id',
          count: 1,
          latestPostDate: 1
        }
      }
    ]);

    res.status(200).json({
      success: true,
      count: topics.length,
      topics
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Get posts matching a specific topic/hashtag
// @route   GET /api/topics/:tag
// @access  Public
exports.getTopicPosts = async (req, res, next) => {
  try {
    let { tag } = req.params;
    if (!tag) {
      return res.status(400).json({
        success: false,
        message: 'Topic tag is required.'
      });
    }

    // Normalize tag: remove leading # and convert to lowercase
    tag = tag.toLowerCase().replace(/^#+/, '').trim();

    if (!tag || tag.length > 50) {
      return res.status(400).json({
        success: false,
        message: 'Invalid topic tag format.'
      });
    }

    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit, 10) || 20));
    const skip = (page - 1) * limit;

    const query = { tags: tag, isHidden: { $ne: true } };

    const [total, posts] = await Promise.all([
      Post.countDocuments(query),
      Post.find(query)
        .sort({ date: -1 })
        .skip(skip)
        .limit(limit)
        .populate('user', 'username name Profilepic Bannerpic isVerified')
        .populate({
          path: 'quotedPost',
          populate: {
            path: 'user',
            select: 'username name Profilepic Bannerpic isVerified'
          }
        })
    ]);

    res.status(200).json({
      success: true,
      tag,
      count: posts.length,
      total,
      page,
      pages: Math.ceil(total / limit),
      posts
    });
  } catch (err) {
    next(err);
  }
};
