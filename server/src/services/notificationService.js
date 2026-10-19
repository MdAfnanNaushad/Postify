const Notification = require('../models/notification');
const User = require('../models/user');
const { getIO } = require('../socket');

/**
 * Strips fenced code blocks (```...```) and inline code (`...`) to prevent
 * accidental mention extraction from source code snippets.
 */
function stripCodeBlocks(text) {
  if (!text) return '';
  return text
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/`[^`\n]+`/g, ' ');
}

/**
 * Extracts valid @username mentions from text, excluding code blocks.
 * Matches @username (alphanumeric and underscore, 1-30 chars).
 */
async function extractMentions(text) {
  if (!text) return [];
  const cleanText = stripCodeBlocks(text);
  const mentionMatches = cleanText.match(/@([a-zA-Z0-9_]{1,30})\b/g);
  if (!mentionMatches || mentionMatches.length === 0) return [];

  // Deduplicate and remove leading '@'
  const usernames = Array.from(new Set(mentionMatches.map((m) => m.slice(1).toLowerCase())));
  if (usernames.length === 0) return [];

  // Query database to only return actual existing users
  const users = await User.find({
    username: { $in: usernames.map((u) => new RegExp(`^${u}$`, 'i')) }
  }).select('_id username');

  return users;
}

/**
 * Creates and persists a notification, then delivers it in real time via Socket.IO.
 */
async function createNotification({ recipient, actor, type, post = null, reply = null }) {
  try {
    if (!recipient || !actor) return null;

    const recipientId = recipient._id ? recipient._id.toString() : recipient.toString();
    const actorId = actor._id ? actor._id.toString() : actor.toString();

    // Rule: Never notify a user about their own actions
    if (recipientId === actorId) return null;

    // Compute stable sourceKey for deterministic deduplication
    const postIdStr = post ? (post._id ? post._id.toString() : post.toString()) : '';
    const replyIdStr = reply ? (reply._id ? reply._id.toString() : reply.toString()) : '';
    let sourceKey = null;

    if (type === 'like') {
      sourceKey = `like:${postIdStr}:${actorId}`;
    } else if (type === 'repost') {
      sourceKey = `repost:${postIdStr}:${actorId}`;
    } else if (type === 'follow') {
      sourceKey = `follow:${recipientId}:${actorId}`;
    } else if (type === 'reply') {
      sourceKey = `reply:${replyIdStr}`;
    } else if (type === 'reply_interaction') {
      sourceKey = `reply_interaction:${replyIdStr}`;
    } else if (type === 'quote') {
      sourceKey = `quote:${postIdStr}`;
    } else if (type === 'mention') {
      sourceKey = `mention:${postIdStr}:${replyIdStr}:${recipientId}`;
    }

    if (sourceKey) {
      const existing = await Notification.findOne({ sourceKey });
      if (existing) return existing;
    }

    // Persist notification
    const notification = await Notification.create({
      recipient: recipientId,
      actor: actorId,
      type,
      post,
      reply,
      sourceKey
    });

    // Populate actor details for client rendering
    const populated = await Notification.findById(notification._id)
      .populate('actor', 'username name Profilepic Bannerpic isVerified')
      .populate('post', 'content date')
      .populate('reply', 'content createdAt');

    // Deliver via Socket.IO if active
    try {
      const io = getIO();
      if (io) {
        // Emit to authenticated user-specific room
        io.to(`user:${recipientId}`).emit('notification:new', populated);

        // Emit updated unread count
        const unreadCount = await Notification.countDocuments({
          recipient: recipientId,
          readAt: null
        });
        io.to(`user:${recipientId}`).emit('notification:unread_count', { count: unreadCount });
      }
    } catch (socketErr) {
      // Socket emission failure should not prevent persistent notification
    }

    return populated;
  } catch (err) {
    console.error('Error creating notification:', err.message);
    return null;
  }
}

/**
 * Helper to process mentions in posts or replies and create mention notifications.
 */
async function processMentions({ content, actorId, postId = null, replyId = null }) {
  try {
    const mentionedUsers = await extractMentions(content);
    for (const targetUser of mentionedUsers) {
      await createNotification({
        recipient: targetUser._id,
        actor: actorId,
        type: 'mention',
        post: postId,
        reply: replyId
      });
    }
  } catch (err) {
    console.error('Error processing mentions:', err.message);
  }
}

async function removeNotificationBySourceKey(sourceKey, recipientId = null) {
  try {
    const notif = await Notification.findOne({ sourceKey });
    if (!notif) return;
    const targetRecipient = recipientId || notif.recipient;
    await Notification.deleteOne({ _id: notif._id });

    try {
      const io = getIO();
      if (io && targetRecipient) {
        const unreadCount = await Notification.countDocuments({
          recipient: targetRecipient,
          readAt: null
        });
        io.to(`user:${targetRecipient.toString()}`).emit('notification:unread_count', { count: unreadCount });
      }
    } catch (e) {}
  } catch (err) {
    console.error('Error removing notification by sourceKey:', err.message);
  }
}

module.exports = {
  createNotification,
  removeNotificationBySourceKey,
  extractMentions,
  processMentions,
  stripCodeBlocks
};
