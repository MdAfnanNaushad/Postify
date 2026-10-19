const User = require('../models/user');
const Post = require('../models/post');
const Project = require('../models/project');
const BuildLog = require('../models/buildLog');

/**
 * Escapes regex metacharacters to safely allow user strings in RegExp searches
 * without regex injection vulnerabilities (ReDoS or query structure alteration).
 */
function escapeRegex(text) {
  return text.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&');
}

// @desc    Global multi-category search (People, Posts, Topics)
// @route   GET /api/search
// @access  Public
exports.search = async (req, res, next) => {
  try {
    const rawQuery = req.query.q || '';
    const query = typeof rawQuery === 'string' ? rawQuery.trim() : '';
    const type = (req.query.type || 'all').toLowerCase(); // 'all', 'people', 'posts', 'topics'
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit, 10) || 20));
    const skip = (page - 1) * limit;

    if (!query || query.length === 0) {
      return res.status(200).json({
        success: true,
        query: '',
        type,
        people: [],
        posts: [],
        topics: [],
        projects: [],
        total: 0,
        page,
        pages: 0
      });
    }

    if (query.length > 100) {
      return res.status(400).json({
        success: false,
        message: 'Search query is too long (maximum 100 characters).'
      });
    }

    const safeRegex = new RegExp(escapeRegex(query), 'i');
    const normalizedTagQuery = query.toLowerCase().replace(/^#+/, '').trim();

    let people = [];
    let posts = [];
    let topics = [];
    let projects = [];
    let totalPeople = 0;
    let totalPosts = 0;
    let totalTopics = 0;
    let totalProjects = 0;

    // 1. Search People (usernames, display names, bio, techStack)
    if (type === 'all' || type === 'people') {
      const userCondition = {
        $or: [
          { username: safeRegex },
          { name: safeRegex },
          { bio: safeRegex },
          { techStack: safeRegex }
        ]
      };

      const peopleLimit = type === 'people' ? limit : 5;
      const peopleSkip = type === 'people' ? skip : 0;

      [totalPeople, people] = await Promise.all([
        User.countDocuments(userCondition),
        User.find(userCondition)
          .select('username name Profilepic Bannerpic isVerified bio techStack location')
          .skip(peopleSkip)
          .limit(peopleLimit)
      ]);
    }

    // 2. Search Posts (content or tags)
    if (type === 'all' || type === 'posts') {
      const postCondition = {
        isHidden: { $ne: true },
        $or: [
          { content: safeRegex },
          { tags: normalizedTagQuery }
        ]
      };

      const postLimit = type === 'posts' ? limit : 10;
      const postSkip = type === 'posts' ? skip : 0;

      [totalPosts, posts] = await Promise.all([
        Post.countDocuments(postCondition),
        Post.find(postCondition)
          .sort({ date: -1 })
          .skip(postSkip)
          .limit(postLimit)
          .populate('user', 'username name Profilepic Bannerpic isVerified')
          .populate({
            path: 'quotedPost',
            populate: {
              path: 'user',
              select: 'username name Profilepic Bannerpic isVerified'
            }
          })
      ]);
    }

    // 3. Search Topics (aggregated tags matching query)
    if (type === 'all' || type === 'topics') {
      const topicLimit = type === 'topics' ? limit : 8;

      const tagRegex = new RegExp(escapeRegex(normalizedTagQuery), 'i');
      const topicResults = await Post.aggregate([
        { $match: { isHidden: { $ne: true } } },
        { $unwind: '$tags' },
        { $match: { tags: tagRegex } },
        {
          $group: {
            _id: '$tags',
            count: { $sum: 1 },
            latestPostDate: { $max: '$date' }
          }
        },
        { $sort: { count: -1 } },
        { $limit: topicLimit },
        {
          $project: {
            _id: 0,
            tag: '$_id',
            count: 1,
            latestPostDate: 1
          }
        }
      ]);

      topics = topicResults;
      totalTopics = topics.length;
    }

    // 4. Search Public Projects (name, shortDescription, description, techStack, or public build logs)
    if (type === 'all' || type === 'projects') {
      let projectIdsFromLogs = [];
      try {
        const matchingLogs = await BuildLog.find({
          isHidden: { $ne: true },
          $or: [
            { title: safeRegex },
            { content: safeRegex },
            { tags: normalizedTagQuery }
          ]
        }).select('project').limit(50);
        projectIdsFromLogs = matchingLogs.map(l => l.project);
      } catch (e) {
        // Ignore build log search error if any
      }

      const projectCondition = {
        visibility: 'public',
        isHidden: { $ne: true },
        $or: [
          { name: safeRegex },
          { shortDescription: safeRegex },
          { description: safeRegex },
          { techStack: safeRegex },
          ...(projectIdsFromLogs.length > 0 ? [{ _id: { $in: projectIdsFromLogs } }] : [])
        ]
      };

      const projectLimit = type === 'projects' ? limit : 6;
      const projectSkip = type === 'projects' ? skip : 0;

      let foundProjects = [];
      [totalProjects, foundProjects] = await Promise.all([
        Project.countDocuments(projectCondition),
        Project.find(projectCondition)
          .populate('owner', 'username name Profilepic isVerified')
          .sort({ updatedAt: -1 })
          .skip(projectSkip)
          .limit(projectLimit)
      ]);

      if (foundProjects.length > 0) {
        const pIds = foundProjects.map(p => p._id);
        const logCounts = await BuildLog.aggregate([
          { $match: { project: { $in: pIds } } },
          { $group: { _id: '$project', count: { $sum: 1 } } }
        ]);
        const countMap = {};
        logCounts.forEach(c => { countMap[c._id.toString()] = c.count; });
        projects = foundProjects.map(p => {
          const obj = p.toObject();
          obj.buildLogCount = countMap[p._id.toString()] || 0;
          return obj;
        });
      }
    }

    const total = totalPeople + totalPosts + totalTopics + totalProjects;

    res.status(200).json({
      success: true,
      query,
      type,
      people,
      posts,
      topics,
      projects,
      pagination: {
        page,
        limit,
        total,
        totalPeople,
        totalPosts,
        totalTopics,
        totalProjects
      }
    });
  } catch (err) {
    next(err);
  }
};
