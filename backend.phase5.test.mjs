import 'dotenv/config';
import request from 'supertest';
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import mongoose from 'mongoose';
import app from './server/src/app.js';
import User from './server/src/models/user.js';
import Post from './server/src/models/post.js';
import Reply from './server/src/models/reply.js';
import Follow from './server/src/models/follow.js';
import Notification from './server/src/models/notification.js';

describe('Phase 5 — Notifications & Real-Time Engagement', () => {
  let userA, userB, userC;
  let cookieA, cookieB, cookieC;
  let postA, replyOnPostA;

  beforeAll(async () => {
    // Strictly isolate tests to miniproject_test
    const uri = process.env.TEST_MONGODB_URI || 'mongodb://127.0.0.1:27017/miniproject_test';
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(uri);
    }

    const ts = Date.now();

    // Register User A
    const resA = await request(app)
      .post('/api/auth/register')
      .send({
        username: `p5_alice_${ts}`,
        name: 'Alice Phase5',
        email: `alice_${ts}@test.com`,
        password: 'Password123!'
      });
    userA = resA.body.user;
    cookieA = resA.headers['set-cookie'][0].split(';')[0];

    // Register User B
    const resB = await request(app)
      .post('/api/auth/register')
      .send({
        username: `p5_bob_${ts}`,
        name: 'Bob Phase5',
        email: `bob_${ts}@test.com`,
        password: 'Password123!'
      });
    userB = resB.body.user;
    cookieB = resB.headers['set-cookie'][0].split(';')[0];

    // Register User C
    const resC = await request(app)
      .post('/api/auth/register')
      .send({
        username: `p5_charlie_${ts}`,
        name: 'Charlie Phase5',
        email: `charlie_${ts}@test.com`,
        password: 'Password123!'
      });
    userC = resC.body.user;
    cookieC = resC.headers['set-cookie'][0].split(';')[0];

    // User A creates post A
    const pRes = await request(app)
      .post('/api/posts')
      .set('Cookie', cookieA)
      .send({ content: 'Hello World from Alice! #javascript' });
    postA = pRes.body.post;
  });

  afterAll(async () => {
    if (userA && userB && userC) {
      const userIds = [userA._id, userB._id, userC._id];
      await Notification.deleteMany({
        $or: [{ recipient: { $in: userIds } }, { actor: { $in: userIds } }]
      });
      await Reply.deleteMany({ user: { $in: userIds } });
      await Post.deleteMany({ user: { $in: userIds } });
      await Follow.deleteMany({
        $or: [{ follower: { $in: userIds } }, { following: { $in: userIds } }]
      });
      await User.deleteMany({ _id: { $in: userIds } });
    }
  });

  it('1. Event: Like Notification — User B liking User A post creates a like notification for User A', async () => {
    const likeRes = await request(app)
      .put(`/api/posts/${postA._id}/like`)
      .set('Cookie', cookieB);
    expect(likeRes.status).toBe(200);

    const notif = await Notification.findOne({
      recipient: userA._id,
      actor: userB._id,
      type: 'like',
      post: postA._id
    });
    expect(notif).not.toBeNull();
    expect(notif.readAt).toBeNull();
  });

  it('2. Rule: Self-notification prevention — User A liking own post does NOT create a notification', async () => {
    await request(app)
      .put(`/api/posts/${postA._id}/like`)
      .set('Cookie', cookieA);

    const selfNotif = await Notification.findOne({
      recipient: userA._id,
      actor: userA._id
    });
    expect(selfNotif).toBeNull();
  });

  it('3. Rule: Duplicate prevention — Repeating like does not duplicate notification', async () => {
    await request(app)
      .put(`/api/posts/${postA._id}/like`)
      .set('Cookie', cookieB);

    const count = await Notification.countDocuments({
      recipient: userA._id,
      actor: userB._id,
      type: 'like',
      post: postA._id
    });
    expect(count).toBe(1);
  });

  it('4. Event: Reply Notification — User B replying to User A post creates a reply notification', async () => {
    const rRes = await request(app)
      .post(`/api/posts/${postA._id}/replies`)
      .set('Cookie', cookieB)
      .send({ content: 'Awesome post Alice!' });
    expect(rRes.status).toBe(201);
    replyOnPostA = rRes.body.reply;

    const notif = await Notification.findOne({
      recipient: userA._id,
      actor: userB._id,
      type: 'reply',
      post: postA._id
    });
    expect(notif).not.toBeNull();
  });

  it('5. Event: Reply Interaction Notification — User C replying to User B reply creates a reply_interaction notification for User B', async () => {
    const nestedRes = await request(app)
      .post(`/api/posts/${postA._id}/replies`)
      .set('Cookie', cookieC)
      .send({
        content: 'I agree with you Bob!',
        parentReply: replyOnPostA._id
      });
    expect(nestedRes.status).toBe(201);

    const notif = await Notification.findOne({
      recipient: userB._id,
      actor: userC._id,
      type: 'reply_interaction',
      reply: nestedRes.body.reply._id
    });
    expect(notif).not.toBeNull();
  });

  it('6. Event: Follow Notification — User B following User A creates a follow notification', async () => {
    const fRes = await request(app)
      .post(`/api/users/${userA._id}/follow`)
      .set('Cookie', cookieB);
    expect(fRes.status).toBe(200);

    const notif = await Notification.findOne({
      recipient: userA._id,
      actor: userB._id,
      type: 'follow'
    });
    expect(notif).not.toBeNull();
  });

  it('7. Rule: Unfollowing does NOT create a notification', async () => {
    const countBefore = await Notification.countDocuments({ recipient: userA._id });

    const unfollowRes = await request(app)
      .delete(`/api/users/${userA._id}/follow`)
      .set('Cookie', cookieB);
    expect(unfollowRes.status).toBe(200);

    const countAfter = await Notification.countDocuments({ recipient: userA._id });
    expect(countAfter).toBe(countBefore);
  });

  it('8. Event: Mention Notification — User B mentioning @userA creates a mention notification', async () => {
    const mRes = await request(app)
      .post('/api/posts')
      .set('Cookie', cookieB)
      .send({ content: `Check this out @${userA.username} you should see this!` });
    expect(mRes.status).toBe(201);

    const notif = await Notification.findOne({
      recipient: userA._id,
      actor: userB._id,
      type: 'mention',
      post: mRes.body.post._id
    });
    expect(notif).not.toBeNull();
  });

  it('9. Rule: Mention validation — Mentions in code blocks do NOT trigger notifications', async () => {
    const codePostRes = await request(app)
      .post('/api/posts')
      .set('Cookie', cookieB)
      .send({ content: `Here is some Python: \`\`\`\n@${userA.username}\ndef my_fn(): pass\n\`\`\`` });
    expect(codePostRes.status).toBe(201);

    const codeNotif = await Notification.findOne({
      recipient: userA._id,
      actor: userB._id,
      type: 'mention',
      post: codePostRes.body.post._id
    });
    expect(codeNotif).toBeNull();
  });

  it('10. Event: Repost Notification — User B reposting User A post creates a repost notification', async () => {
    const repostRes = await request(app)
      .post(`/api/posts/${postA._id}/repost`)
      .set('Cookie', cookieB);
    expect(repostRes.status).toBe(200);

    const notif = await Notification.findOne({
      recipient: userA._id,
      actor: userB._id,
      type: 'repost',
      post: postA._id
    });
    expect(notif).not.toBeNull();
  });

  it('11. Event: Quote-Post Notification — User C quote-posting User A post creates a quote notification', async () => {
    const quoteRes = await request(app)
      .post('/api/posts')
      .set('Cookie', cookieC)
      .send({
        content: 'This is brilliant insight!',
        quotedPost: postA._id
      });
    expect(quoteRes.status).toBe(201);

    const notif = await Notification.findOne({
      recipient: userA._id,
      actor: userC._id,
      type: 'quote',
      post: quoteRes.body.post._id
    });
    expect(notif).not.toBeNull();
  });

  it('12. API: Unread count endpoint returns accurate count for recipient', async () => {
    const res = await request(app)
      .get('/api/notifications/unread-count')
      .set('Cookie', cookieA);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.unreadCount).toBeGreaterThanOrEqual(4);
  });

  it('13. API: Fetch notifications with pagination for authenticated user', async () => {
    const res = await request(app)
      .get('/api/notifications?limit=2')
      .set('Cookie', cookieA);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.notifications.length).toBe(2);
    expect(res.body.pagination.hasMore).toBe(true);
    expect(res.body.pagination.nextCursor).toBeDefined();
  });

  it('14. API: Mark individual notification as read', async () => {
    const listRes = await request(app)
      .get('/api/notifications')
      .set('Cookie', cookieA);
    const firstNotif = listRes.body.notifications.find((n) => !n.readAt);

    const markRes = await request(app)
      .patch(`/api/notifications/${firstNotif._id}/read`)
      .set('Cookie', cookieA);
    expect(markRes.status).toBe(200);
    expect(markRes.body.notification.readAt).not.toBeNull();
  });

  it('15. Security & Isolation: User B CANNOT mark or delete User A notification (403 Forbidden)', async () => {
    const listRes = await request(app)
      .get('/api/notifications')
      .set('Cookie', cookieA);
    const aNotif = listRes.body.notifications[0];

    const rogueMarkRes = await request(app)
      .patch(`/api/notifications/${aNotif._id}/read`)
      .set('Cookie', cookieB);
    expect(rogueMarkRes.status).toBe(403);

    const rogueDeleteRes = await request(app)
      .delete(`/api/notifications/${aNotif._id}`)
      .set('Cookie', cookieB);
    expect(rogueDeleteRes.status).toBe(403);
  });

  it('16. API: Mark all notifications as read', async () => {
    const markAllRes = await request(app)
      .patch('/api/notifications/read-all')
      .set('Cookie', cookieA);
    expect(markAllRes.status).toBe(200);

    const unreadRes = await request(app)
      .get('/api/notifications/unread-count')
      .set('Cookie', cookieA);
    expect(unreadRes.body.unreadCount).toBe(0);
  });

  it('17. Cascade Cleanup: Deleting post cascades and removes associated notifications', async () => {
    // User B creates a post that User A likes
    const tempPostRes = await request(app)
      .post('/api/posts')
      .set('Cookie', cookieB)
      .send({ content: 'Temporary post to test cascade deletion' });
    const tempPost = tempPostRes.body.post;

    await request(app)
      .put(`/api/posts/${tempPost._id}/like`)
      .set('Cookie', cookieA);

    const notifBefore = await Notification.findOne({ post: tempPost._id });
    expect(notifBefore).not.toBeNull();

    // Delete post
    const delRes = await request(app)
      .delete(`/api/posts/${tempPost._id}`)
      .set('Cookie', cookieB);
    expect(delRes.status).toBe(200);

    const notifAfter = await Notification.findOne({ post: tempPost._id });
    expect(notifAfter).toBeNull();
  });
});
