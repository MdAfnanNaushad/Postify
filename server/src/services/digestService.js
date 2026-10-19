const mongoose = require('mongoose');
const Digest = require('../models/digest');
const DigestPreference = require('../models/digestPreference');
const Post = require('../models/post');
const Reply = require('../models/reply');
const Follow = require('../models/follow');
const Project = require('../models/project');
const BuildLog = require('../models/buildLog');
const Notification = require('../models/notification');
const User = require('../models/user');
const { getWeekBounds } = require('../utils/digestUtils');
const { sendDigestEmail } = require('./emailService');

/**
 * Generates or refreshes a deterministic weekly digest for a specific user
 */
async function generateDigestForUser(userId, periodOrDate = new Date(), options = {}) {
  const { periodKey, startDate, endDate, label } = getWeekBounds(periodOrDate);

  // 1. Check if digest already exists for this user and period (Idempotent)
  const existing = await Digest.findOne({ user: userId, periodKey });
  if (existing && !options.force) {
    return existing;
  }

  // 2. Fetch user and preferences
  const [user, preference] = await Promise.all([
    User.findById(userId).select('_id username name email Profilepic'),
    DigestPreference.findOne({ user: userId })
  ]);

  if (!user) {
    throw new Error('User not found.');
  }

  // If user explicitly disabled digests and this is an automated batch run, skip
  if (preference && preference.enabled === false && !options.force) {
    return null;
  }

  // 3. Find developers the user follows
  const follows = await Follow.find({ follower: userId }).select('following');
  const followedUserIds = follows.map((f) => f.following);

  // 4. Section: Followed Developers Posts
  let followedPosts = [];
  if (followedUserIds.length > 0 && (!preference || preference.includeFollowedPosts !== false)) {
    const posts = await Post.find({
      user: { $in: followedUserIds },
      isHidden: { $ne: true },
      createdAt: { $gte: startDate, $lte: endDate }
    })
      .sort({ createdAt: -1 })
      .limit(10)
      .populate('user', 'username name Profilepic isVerified')
      .lean();

    followedPosts = posts.map((p) => ({
      _id: p._id,
      content: p.content || '',
      author: {
        _id: p.user?._id,
        username: p.user?.username || 'anonymous',
        name: p.user?.name || '',
        Profilepic: p.user?.Profilepic || '',
        isVerified: Boolean(p.user?.isVerified)
      },
      replyCount: Array.isArray(p.replies) ? p.replies.length : 0,
      likesCount: Array.isArray(p.likes) ? p.likes.length : 0,
      createdAt: p.createdAt
    }));
  }

  // 5. Section: Post Activity & Interactions on the User's Own Posts
  let postActivity = {
    totalNewReplies: 0,
    totalNewLikes: 0,
    interactions: []
  };

  if (!preference || preference.includeInteractions !== false) {
    // Find user's posts
    const myPosts = await Post.find({ user: userId }).select('_id content likes').lean();
    const myPostIds = myPosts.map((p) => p._id);

    if (myPostIds.length > 0) {
      // Find replies by OTHER users on the user's posts during this week
      const replies = await Reply.find({
        post: { $in: myPostIds },
        user: { $ne: userId },
        createdAt: { $gte: startDate, $lte: endDate }
      })
        .sort({ createdAt: -1 })
        .limit(10)
        .populate('user', 'username name Profilepic')
        .populate('post', 'content')
        .lean();

      postActivity.totalNewReplies = replies.length;

      postActivity.interactions = replies.map((r) => ({
        type: 'reply',
        postId: r.post?._id || r.post,
        postExcerpt: (r.post?.content || '').slice(0, 80),
        actor: {
          _id: r.user?._id,
          username: r.user?.username || 'developer',
          name: r.user?.name || '',
          Profilepic: r.user?.Profilepic || ''
        },
        createdAt: r.createdAt
      }));

      // Calculate total likes count across user's posts
      postActivity.totalNewLikes = myPosts.reduce(
        (sum, p) => sum + (Array.isArray(p.likes) ? p.likes.length : 0),
        0
      );
    }
  }

  // 6. Section: Unread Notifications
  const unreadNotifs = await Notification.find({
    recipient: userId,
    readAt: null,
    createdAt: { $gte: startDate, $lte: endDate }
  })
    .sort({ createdAt: -1 })
    .limit(5)
    .populate('actor', 'username name Profilepic')
    .lean();

  const unreadNotifications = unreadNotifs.map((n) => ({
    _id: n._id,
    type: n.type,
    sender: {
      _id: n.actor?._id,
      username: n.actor?.username || 'system',
      name: n.actor?.name || '',
      Profilepic: n.actor?.Profilepic || ''
    },
    message: n.message || `${n.type} on your activity`,
    createdAt: n.createdAt
  }));

  // 7. Section: Followed Public Build Logs (Strict privacy check: public projects only)
  let followedBuildLogs = [];
  if (followedUserIds.length > 0 && (!preference || preference.includeBuildLogs !== false)) {
    const publicProjects = await Project.find({
      owner: { $in: followedUserIds },
      visibility: 'public',
      isHidden: { $ne: true }
    })
      .select('_id name slug owner')
      .populate('owner', 'username')
      .lean();

    const publicProjectIds = publicProjects.map((proj) => proj._id);
    const projectMap = publicProjects.reduce((acc, p) => {
      acc[p._id.toString()] = p;
      return acc;
    }, {});

    if (publicProjectIds.length > 0) {
      const logs = await BuildLog.find({
        project: { $in: publicProjectIds },
        isHidden: { $ne: true },
        createdAt: { $gte: startDate, $lte: endDate }
      })
        .sort({ createdAt: -1 })
        .limit(10)
        .lean();

      followedBuildLogs = logs.map((l) => {
        const parent = projectMap[l.project.toString()] || {};
        return {
          _id: l._id,
          title: l.title,
          entryType: l.entryType,
          project: {
            _id: parent._id,
            name: parent.name,
            slug: parent.slug,
            ownerUsername: parent.owner?.username || 'developer'
          },
          createdAt: l.createdAt
        };
      });
    }
  }

  // 8. Section: Public Highlights (Discovery: strictly public projects and posts)
  let publicHighlights = [];
  if (!preference || preference.includeHighlights !== false) {
    const [highlightProjects, highlightPosts] = await Promise.all([
      Project.find({ visibility: 'public', isHidden: { $ne: true } })
        .sort({ createdAt: -1 })
        .limit(3)
        .populate('owner', 'username name')
        .lean(),
      Post.find({
        isHidden: { $ne: true },
        createdAt: { $gte: startDate, $lte: endDate }
      })
        .sort({ createdAt: -1 })
        .limit(3)
        .populate('user', 'username name')
        .lean()
    ]);

    const projHighlights = highlightProjects.map((p) => ({
      type: 'project',
      _id: p._id,
      title: p.name,
      description: p.shortDescription || p.description?.slice(0, 100) || '',
      authorName: p.owner?.name || p.owner?.username || 'Developer',
      authorUsername: p.owner?.username || 'developer',
      slug: p.slug,
      techStack: p.techStack || [],
      createdAt: p.createdAt
    }));

    const postHighlights = highlightPosts.map((p) => ({
      type: 'post',
      _id: p._id,
      title: '',
      description: (p.content || '').slice(0, 120),
      authorName: p.user?.name || p.user?.username || 'Developer',
      authorUsername: p.user?.username || 'developer',
      slug: '',
      techStack: [],
      createdAt: p.createdAt
    }));

    publicHighlights = [...projHighlights, ...postHighlights].slice(0, 5);
  }

  // 9. Generate concise summary text
  const parts = [];
  if (followedPosts.length > 0) {
    parts.push(`${followedPosts.length} new update${followedPosts.length === 1 ? '' : 's'} from followed engineers`);
  }
  if (postActivity.totalNewReplies > 0) {
    parts.push(`${postActivity.totalNewReplies} response${postActivity.totalNewReplies === 1 ? '' : 's'} on your posts`);
  }
  if (followedBuildLogs.length > 0) {
    parts.push(`${followedBuildLogs.length} project build log${followedBuildLogs.length === 1 ? '' : 's'}`);
  }
  if (unreadNotifications.length > 0) {
    parts.push(`${unreadNotifications.length} notification${unreadNotifications.length === 1 ? '' : 's'} to review`);
  }

  let summary = parts.length > 0
    ? parts.join(' • ')
    : 'Discover technical highlights and engineering build logs across Postify this week.';

  // 10. Persist or Update Digest document
  const digestData = {
    user: userId,
    periodKey,
    startDate,
    endDate,
    generatedAt: new Date(),
    summary,
    sections: {
      followedPosts,
      postActivity,
      unreadNotificationsCount: unreadNotifications.length,
      unreadNotifications,
      followedBuildLogs,
      publicHighlights
    }
  };

  let digestDoc;
  if (existing) {
    if (existing.deliveryStatus === 'email_sent') {
      digestData.deliveryStatus = 'email_sent';
    } else if (existing.deliveryStatus === 'sending') {
      digestData.deliveryStatus = 'sending';
    } else {
      digestData.deliveryStatus = existing.deliveryStatus || 'in_app_only';
    }
    Object.assign(existing, digestData);
    digestDoc = await existing.save();
  } else {
    digestData.deliveryStatus = 'in_app_only';
    try {
      digestDoc = await Digest.create(digestData);
    } catch (err) {
      if (err.code === 11000) {
        // Concurrent worker created the document in the same millisecond: fetch existing
        digestDoc = await Digest.findOne({ user: userId, periodKey });
      } else {
        throw err;
      }
    }
  }

  // 11. Optional Email Delivery: only if user has explicitly enabled emailDelivery
  if (preference && preference.emailDelivery === true) {
    // Hard deduplication rule: if digest already has email_sent, NEVER claim or resend, even with --force
    if (digestDoc.deliveryStatus !== 'email_sent') {
      const STALE_LOCK_MS = 5 * 60 * 1000; // 5 minute stale claim threshold for process crash recovery
      const now = new Date();
      const staleThreshold = new Date(now.getTime() - STALE_LOCK_MS);

      // Atomic conditional transition:
      // A worker can ONLY claim this digest delivery if:
      // 1. It is not already 'email_sent'
      // 2. It does not have an unresolved ambiguous timeout (unconfirmed delivery)
      // 3. deliveryAttempts < 3 (bounded retry policy)
      // 4. Status is currently unattempted/failed/disabled OR
      //    a previous worker claimed 'sending' but crashed/timed out > 5 minutes ago.
      const claim = await Digest.findOneAndUpdate(
        {
          _id: digestDoc._id,
          deliveryStatus: { $ne: 'email_sent' },
          isAmbiguousTimeout: { $ne: true },
          deliveryAttempts: { $lt: 3 },
          $or: [
            { deliveryStatus: { $in: ['in_app_only', 'email_failed', 'disabled'] } },
            { deliveryStatus: 'sending', lastDeliveryAttemptAt: { $lt: staleThreshold } }
          ]
        },
        {
          $set: {
            deliveryStatus: 'sending',
            lastDeliveryAttemptAt: now,
            deliveryKey: `digest_${digestDoc._id}_${userId}_${periodKey}`
          }
        },
        { new: true }
      );

      // If claim succeeded, this worker is the exclusive sender
      if (claim) {
        const emailResult = await sendDigestEmail({
          user,
          digest: claim,
          dateRangeLabel: label,
          mockResend: options.mockResend || null,
          mockTransport: options.mockEmailTransport || options.mockTransport || null,
          force: false // Deduplication and bounded retries cannot be bypassed
        });

        claim.deliveryStatus = emailResult.status || 'in_app_only';
        claim.deliveryKey = emailResult.deliveryKey || `digest_${digestDoc._id}_${userId}_${periodKey}`;
        claim.lastDeliveryAttemptAt = new Date();
        if (emailResult.messageId) {
          claim.emailMessageId = emailResult.messageId;
        }
        if (emailResult.isAmbiguousTimeout !== undefined) {
          claim.isAmbiguousTimeout = Boolean(emailResult.isAmbiguousTimeout);
        }
        if (emailResult.status === 'email_failed') {
          claim.deliveryAttempts = (claim.deliveryAttempts || 0) + 1;
          claim.deliveryError = emailResult.error || 'Delivery attempt failed';
        } else if (emailResult.status === 'email_sent') {
          claim.deliveryError = null;
          claim.isAmbiguousTimeout = false;
        }
        await claim.save();
        digestDoc = claim;

        preference.lastDeliveredAt = new Date();
        preference.lastDeliveryStatus = emailResult.status;
        preference.lastGeneratedPeriod = periodKey;
        if (emailResult.error) {
          preference.lastDeliveryError = emailResult.error;
        }
        await preference.save();
      }
    }
  } else {
    if (!digestDoc.deliveryStatus || digestDoc.deliveryStatus === 'disabled') {
      digestDoc.deliveryStatus = 'in_app_only';
      await digestDoc.save();
    }
    if (preference) {
      preference.lastGeneratedPeriod = periodKey;
      await preference.save();
    }
  }

  return digestDoc;
}

/**
 * Retrieves current or specific weekly digest for a user (generates on-demand if needed)
 */
async function getDigestForUser(userId, periodOrDate = new Date()) {
  const { periodKey } = getWeekBounds(periodOrDate);
  let digest = await Digest.findOne({ user: userId, periodKey });
  if (!digest) {
    digest = await generateDigestForUser(userId, periodOrDate);
  }
  return digest;
}

/**
 * Lists past digest periods for a user
 */
async function getDigestHistory(userId, limit = 10) {
  return await Digest.find({ user: userId })
    .sort({ createdAt: -1 })
    .limit(limit)
    .select('periodKey startDate endDate summary isRead deliveryStatus createdAt')
    .lean();
}

/**
 * Batch generate digests for all active users (used by scheduled job or admin CLI)
 */
async function generateAllActiveDigests(periodOrDate = new Date(), options = {}) {
  const { periodKey } = getWeekBounds(periodOrDate);

  // Find all users who haven't explicitly disabled digests
  const disabledPrefs = await DigestPreference.find({ enabled: false }).select('user');
  const disabledUserIds = disabledPrefs.map((p) => p.user);

  const users = await User.find({ _id: { $nin: disabledUserIds } }).select('_id');
  const results = {
    total: users.length,
    generated: 0,
    alreadyCurrent: 0,
    emailsSent: 0,
    emailsFailed: 0,
    emailsSkipped: 0,
    emailDisabled: 0,
    errors: 0
  };

  for (const u of users) {
    try {
      const existing = await Digest.findOne({ user: u._id, periodKey });
      const doc = await generateDigestForUser(u._id, periodKey, options);
      if (doc) {
        if (existing && !options.force) {
          results.alreadyCurrent++;
        } else {
          results.generated++;
        }

        if (doc.deliveryStatus === 'email_sent') {
          results.emailsSent++;
        } else if (doc.deliveryStatus === 'email_failed') {
          results.emailsFailed++;
        } else if (doc.deliveryStatus === 'disabled') {
          results.emailDisabled++;
        } else {
          results.emailsSkipped++;
        }
      } else {
        results.emailsSkipped++;
      }
    } catch (err) {
      results.errors++;
    }
  }

  return results;
}

module.exports = {
  generateDigestForUser,
  getDigestForUser,
  getDigestHistory,
  generateAllActiveDigests
};
