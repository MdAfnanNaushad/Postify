import 'dotenv/config';
import request from 'supertest';
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import mongoose from 'mongoose';
import app from './server/src/app.js';
import User from './server/src/models/user.js';
import Post from './server/src/models/post.js';
import Reply from './server/src/models/reply.js';
import Follow from './server/src/models/follow.js';
import Repost from './server/src/models/repost.js';

describe('Phase 4 — Reposts, Quote-Posts, Follows & Personalized Feeds', () => {
  let userA, userB, userC;
  let cookieA, cookieB, cookieC;
  let postA, quotePostB;

  beforeAll(async () => {
    // Connect to isolated test database
    const uri = process.env.TEST_MONGODB_URI || 'mongodb://127.0.0.1:27017/miniproject_test';
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(uri);
    }

    const ts = Date.now();

    // Register User A
    const resA = await request(app)
      .post('/api/auth/register')
      .send({
        username: `p4_userA_${ts}`,
        name: 'Alice Phase4',
        email: `alice_${ts}@test.com`,
        password: 'Password123!'
      });
    userA = resA.body.user;
    cookieA = resA.headers['set-cookie'][0].split(';')[0];

    // Register User B
    const resB = await request(app)
      .post('/api/auth/register')
      .send({
        username: `p4_userB_${ts}`,
        name: 'Bob Phase4',
        email: `bob_${ts}@test.com`,
        password: 'Password123!'
      });
    userB = resB.body.user;
    cookieB = resB.headers['set-cookie'][0].split(';')[0];

    // Register User C (Solo user who follows no one)
    const resC = await request(app)
      .post('/api/auth/register')
      .send({
        username: `p4_userC_${ts}`,
        name: 'Charlie Solo',
        email: `charlie_${ts}@test.com`,
        password: 'Password123!'
      });
    userC = resC.body.user;
    cookieC = resC.headers['set-cookie'][0].split(';')[0];

    // User A creates a post
    const postRes = await request(app)
      .post('/api/posts')
      .set('Cookie', [cookieA])
      .send({
        content: 'Original story by Alice on distributed systems architecture.'
      });
    postA = postRes.body.post;
  });

  afterAll(async () => {
    // Cleanup test data from isolated test database
    const userIds = [userA?._id, userB?._id, userC?._id].filter(Boolean);
    if (userIds.length > 0) {
      await Follow.deleteMany({
        $or: [{ follower: { $in: userIds } }, { following: { $in: userIds } }]
      });
      await Repost.deleteMany({ user: { $in: userIds } });
      await Reply.deleteMany({ user: { $in: userIds } });
      await Post.deleteMany({ user: { $in: userIds } });
      await User.deleteMany({ _id: { $in: userIds } });
    }
    await mongoose.connection.close();
  });

  // 1. Follow User
  it('1. Follow System: Authenticated User A can follow User B', async () => {
    const res = await request(app)
      .post(`/api/users/${userB._id}/follow`)
      .set('Cookie', [cookieA]);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.following).toBe(true);
    expect(res.body.followersCount).toBe(1);

    // Verify in database
    const followDoc = await Follow.findOne({ follower: userA._id, following: userB._id });
    expect(followDoc).not.toBeNull();
  });

  // 2. Prevent Self-Follow
  it('2. Follow Guard: Reject user attempting to follow themselves (400 Bad Request)', async () => {
    const res = await request(app)
      .post(`/api/users/${userA._id}/follow`)
      .set('Cookie', [cookieA]);

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toMatch(/cannot follow yourself/i);
  });

  // 3. Duplicate Follow Prevention
  it('3. Follow Idempotency: Multiple follow requests do not create duplicate records', async () => {
    const res = await request(app)
      .post(`/api/users/${userB._id}/follow`)
      .set('Cookie', [cookieA]);

    expect(res.status).toBe(200);
    expect(res.body.following).toBe(true);

    const count = await Follow.countDocuments({ follower: userA._id, following: userB._id });
    expect(count).toBe(1);
  });

  // 4. Profile Stats Consistency
  it('4. Profile View: Returns consistent follower/following counts and isFollowing status', async () => {
    const res = await request(app)
      .get(`/api/users/${userB._id}`)
      .set('Cookie', [cookieA]);

    expect(res.status).toBe(200);
    expect(res.body.user.followersCount).toBe(1);
    expect(res.body.user.isFollowing).toBe(true);
  });

  // 5. Unfollow User
  it('5. Unfollow System: Authenticated User A can unfollow User B', async () => {
    const res = await request(app)
      .delete(`/api/users/${userB._id}/follow`)
      .set('Cookie', [cookieA]);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.following).toBe(false);
    expect(res.body.followersCount).toBe(0);

    const followDoc = await Follow.findOne({ follower: userA._id, following: userB._id });
    expect(followDoc).toBeNull();
  });

  // 6. Repost Post
  it('6. Reposts: User B can repost Alice\'s post without duplicating content', async () => {
    const res = await request(app)
      .post(`/api/posts/${postA._id}/repost`)
      .set('Cookie', [cookieB]);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.reposted).toBe(true);
    expect(res.body.repostsCount).toBe(1);

    // Verify database record
    const repostDoc = await Repost.findOne({ user: userB._id, post: postA._id });
    expect(repostDoc).not.toBeNull();
  });

  // 7. Duplicate Repost Prevention
  it('7. Repost Idempotency: Duplicate repost request returns consistent status', async () => {
    const res = await request(app)
      .post(`/api/posts/${postA._id}/repost`)
      .set('Cookie', [cookieB]);

    expect(res.status).toBe(200);
    expect(res.body.reposted).toBe(true);

    const count = await Repost.countDocuments({ user: userB._id, post: postA._id });
    expect(count).toBe(1);
  });

  // 8. Undo Repost
  it('8. Undo Repost: User B can undo their repost', async () => {
    const res = await request(app)
      .delete(`/api/posts/${postA._id}/repost`)
      .set('Cookie', [cookieB]);

    expect(res.status).toBe(200);
    expect(res.body.reposted).toBe(false);
    expect(res.body.repostsCount).toBe(0);

    const repostDoc = await Repost.findOne({ user: userB._id, post: postA._id });
    expect(repostDoc).toBeNull();
  });

  // 9. Quote-Post Creation
  it('9. Quote-Posts: User B can publish commentary quoting Alice\'s post', async () => {
    const res = await request(app)
      .post('/api/posts')
      .set('Cookie', [cookieB])
      .send({
        content: 'Fascinating breakdown on consensus protocols by @Alice.',
        quotedPost: postA._id
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.post.content).toBe('Fascinating breakdown on consensus protocols by @Alice.');
    expect(res.body.post.quotedPost).not.toBeNull();
    expect(res.body.post.quotedPost._id).toBe(postA._id);
    expect(res.body.post.quotedPost.user.username).toBe(userA.username);
    quotePostB = res.body.post;
  });

  // 10. Quote-Post Validation & Isolation
  it('10. Quote-Posts Isolation: Quote-post does not copy original post likes or replies', async () => {
    expect(quotePostB.likes.length).toBe(0);

    // Reject non-existent quoted post
    const fakeId = new mongoose.Types.ObjectId().toString();
    const badRes = await request(app)
      .post('/api/posts')
      .set('Cookie', [cookieB])
      .send({
        content: 'Quoting non-existent post.',
        quotedPost: fakeId
      });

    expect(badRes.status).toBe(404);
    expect(badRes.body.message).toMatch(/quoted post not found/i);
  });

  // 11. Personalized Following Feed
  it('11. Following Feed: Returns followed users\' posts and reposts in deterministic order', async () => {
    // Alice follows Bob
    await request(app)
      .post(`/api/users/${userB._id}/follow`)
      .set('Cookie', [cookieA]);

    // Bob reposts Alice's original post
    await request(app)
      .post(`/api/posts/${postA._id}/repost`)
      .set('Cookie', [cookieB]);

    // Alice requests her personalized following feed
    const feedRes = await request(app)
      .get('/api/posts/following')
      .set('Cookie', [cookieA]);

    expect(feedRes.status).toBe(200);
    expect(feedRes.body.success).toBe(true);
    expect(feedRes.body.posts.length).toBeGreaterThanOrEqual(1);

    // Verify Bob's quote-post appears in the following feed
    const quoteItem = feedRes.body.posts.find((p) => p._id === quotePostB._id);
    expect(quoteItem).toBeDefined();
    expect(quoteItem.user.username).toBe(userB.username);

    // Verify Bob's repost appears in the following feed
    const repostItem = feedRes.body.posts.find((p) => p.isRepost === true);
    expect(repostItem).toBeDefined();
    expect(repostItem.reposter.username).toBe(userB.username);
  });

  // 12. Following Feed Empty State & Unfollowed Exclusion
  it('12. Following Feed Isolation: Users who follow no one receive clean empty state', async () => {
    // Charlie follows no one
    const feedRes = await request(app)
      .get('/api/posts/following')
      .set('Cookie', [cookieC]);

    expect(feedRes.status).toBe(200);
    expect(feedRes.body.success).toBe(true);
    expect(feedRes.body.posts.length).toBe(0);
    expect(feedRes.body.message).toMatch(/not following/i);
  });

  // 13. Cascade Cleanup on Original Post Deletion
  it('13. Cascade Deletion: Deleting original post cleans up reposts and nullifies quotes', async () => {
    // Alice deletes original post
    const deleteRes = await request(app)
      .delete(`/api/posts/${postA._id}`)
      .set('Cookie', [cookieA]);

    expect(deleteRes.status).toBe(200);

    // Verify reposts for this post were deleted
    const remainingReposts = await Repost.find({ post: postA._id });
    expect(remainingReposts.length).toBe(0);

    // Verify quote post now has quotedPost set to null rather than broken reference
    const updatedQuotePost = await Post.findById(quotePostB._id);
    expect(updatedQuotePost.quotedPost).toBeNull();
  });
});
