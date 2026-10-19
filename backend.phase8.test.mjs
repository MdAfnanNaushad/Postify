import 'dotenv/config';
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import mongoose from 'mongoose';
import app from './server/src/app.js';
import User from './server/src/models/user.js';
import Post from './server/src/models/post.js';
import Bookmark from './server/src/models/bookmark.js';
import Collection from './server/src/models/collection.js';

describe('Phase 8 — Bookmarks and Private Collections', () => {
  let userA, userB;
  let cookieA, cookieB;
  let post1, post2, post3;

  beforeAll(async () => {
    const uri = process.env.TEST_MONGODB_URI || 'mongodb://127.0.0.1:27017/miniproject_test';
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(uri);
    }

    const ts = Date.now();

    // Register User A
    const resA = await request(app)
      .post('/api/auth/register')
      .send({
        username: `p8_alice_${ts}`,
        name: 'Alice Bookmarks',
        email: `alice_${ts}@test.com`,
        password: 'Password123!'
      });
    userA = resA.body.user;
    cookieA = resA.headers['set-cookie'][0].split(';')[0];

    // Register User B (for privacy/isolation testing)
    const resB = await request(app)
      .post('/api/auth/register')
      .send({
        username: `p8_bob_${ts}`,
        name: 'Bob Bookmarks',
        email: `bob_${ts}@test.com`,
        password: 'Password123!'
      });
    userB = resB.body.user;
    cookieB = resB.headers['set-cookie'][0].split(';')[0];

    // Create 3 posts
    const p1 = await request(app)
      .post('/api/posts')
      .set('Cookie', cookieA)
      .send({ content: 'Deep dive into Spring Boot & Microservices #java #springboot' });
    post1 = p1.body.post;

    const p2 = await request(app)
      .post('/api/posts')
      .set('Cookie', cookieA)
      .send({ content: 'System Design: Distributed Caching with Redis #systemdesign #redis' });
    post2 = p2.body.post;

    const p3 = await request(app)
      .post('/api/posts')
      .set('Cookie', cookieB)
      .send({ content: 'React 19 Server Components Explained #react #frontend' });
    post3 = p3.body.post;
  });

  afterAll(async () => {
    if (userA && userB) {
      const uIds = [userA._id, userB._id];
      await Bookmark.deleteMany({ user: { $in: uIds } });
      await Collection.deleteMany({ user: { $in: uIds } });
      await Post.deleteMany({ user: { $in: uIds } });
      await User.deleteMany({ _id: { $in: uIds } });
    }
  });

  it('1. Bookmark a post: saves post to user bookmarks', async () => {
    const res = await request(app)
      .post('/api/bookmarks')
      .set('Cookie', cookieA)
      .send({ postId: post1._id });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.bookmarked).toBe(true);

    const bm = await Bookmark.findOne({ user: userA._id, post: post1._id });
    expect(bm).not.toBeNull();
  });

  it('2. Repeat bookmark request: idempotent without creating duplicates', async () => {
    const res = await request(app)
      .post('/api/bookmarks')
      .set('Cookie', cookieA)
      .send({ postId: post1._id });

    expect(res.status).toBe(200);
    expect(res.body.bookmarked).toBe(true);

    const count = await Bookmark.countDocuments({ user: userA._id, post: post1._id });
    expect(count).toBe(1);
  });

  it('3. Concurrent bookmark requests: atomic upsert guarantees exactly 1 bookmark', async () => {
    const promises = Array.from({ length: 5 }, () =>
      request(app)
        .post('/api/bookmarks')
        .set('Cookie', cookieA)
        .send({ postId: post2._id })
    );

    const results = await Promise.all(promises);
    results.forEach((r) => expect(r.status).toBe(200));

    const count = await Bookmark.countDocuments({ user: userA._id, post: post2._id });
    expect(count).toBe(1);
  });

  it('4. Reject malformed or nonexistent post IDs', async () => {
    const malformed = await request(app)
      .post('/api/bookmarks')
      .set('Cookie', cookieA)
      .send({ postId: 'not-valid-id' });
    expect(malformed.status).toBe(400);

    const fakeId = new mongoose.Types.ObjectId();
    const nonexistent = await request(app)
      .post('/api/bookmarks')
      .set('Cookie', cookieA)
      .send({ postId: fakeId });
    expect(nonexistent.status).toBe(404);
  });

  it('5. Check bookmark status and batch check endpoint', async () => {
    const single = await request(app)
      .get(`/api/bookmarks/check/${post1._id}`)
      .set('Cookie', cookieA);
    expect(single.status).toBe(200);
    expect(single.body.bookmarked).toBe(true);

    const singleUnsaved = await request(app)
      .get(`/api/bookmarks/check/${post3._id}`)
      .set('Cookie', cookieA);
    expect(singleUnsaved.status).toBe(200);
    expect(singleUnsaved.body.bookmarked).toBe(false);

    const batch = await request(app)
      .post('/api/bookmarks/check-batch')
      .set('Cookie', cookieA)
      .send({ postIds: [post1._id, post2._id, post3._id] });

    expect(batch.status).toBe(200);
    expect(batch.body.bookmarkedPostIds).toContain(post1._id.toString());
    expect(batch.body.bookmarkedPostIds).toContain(post2._id.toString());
    expect(batch.body.bookmarkedPostIds).not.toContain(post3._id.toString());
  });

  it('6. Unbookmark a post: removes bookmark cleanly', async () => {
    const res = await request(app)
      .delete(`/api/bookmarks/${post2._id}`)
      .set('Cookie', cookieA);

    expect(res.status).toBe(200);
    expect(res.body.bookmarked).toBe(false);

    const count = await Bookmark.countDocuments({ user: userA._id, post: post2._id });
    expect(count).toBe(0);
  });

  it('7. User isolation: User B cannot see User A bookmarks', async () => {
    const resB = await request(app)
      .get('/api/bookmarks')
      .set('Cookie', cookieB);

    expect(resB.status).toBe(200);
    expect(resB.body.bookmarks.length).toBe(0);

    // User B checking User A bookmarked post
    const checkB = await request(app)
      .get(`/api/bookmarks/check/${post1._id}`)
      .set('Cookie', cookieB);
    expect(checkB.status).toBe(200);
    expect(checkB.body.bookmarked).toBe(false);
  });

  it('8. Create, rename, and manage private collections', async () => {
    // Create collection
    const c1 = await request(app)
      .post('/api/collections')
      .set('Cookie', cookieA)
      .send({
        name: 'Spring Boot Resources',
        description: 'Curated articles and code snippets'
      });
    expect(c1.status).toBe(201);
    expect(c1.body.collection.name).toBe('Spring Boot Resources');
    const collId = c1.body.collection._id;

    // Enforce name limit & duplicate check
    const dup = await request(app)
      .post('/api/collections')
      .set('Cookie', cookieA)
      .send({ name: 'spring boot resources' });
    expect(dup.status).toBe(400);
    expect(dup.body.message).toContain('already exists');

    // Rename collection
    const renamed = await request(app)
      .patch(`/api/collections/${collId}`)
      .set('Cookie', cookieA)
      .send({ name: 'Spring Boot & Microservices' });
    expect(renamed.status).toBe(200);
    expect(renamed.body.collection.name).toBe('Spring Boot & Microservices');

    // List collections
    const list = await request(app)
      .get('/api/collections')
      .set('Cookie', cookieA);
    expect(list.status).toBe(200);
    expect(list.body.collections.length).toBeGreaterThanOrEqual(1);
    expect(list.body.collections.some((c) => c._id === collId)).toBe(true);
  });

  it('9. Private collection boundary: User B CANNOT access or modify User A collection (403/404)', async () => {
    const cA = await Collection.findOne({ user: userA._id });
    expect(cA).not.toBeNull();

    // User B tries to get User A's collection
    const getForbidden = await request(app)
      .get(`/api/collections/${cA._id}`)
      .set('Cookie', cookieB);
    expect(getForbidden.status).toBe(403);

    // User B tries to update User A's collection
    const patchForbidden = await request(app)
      .patch(`/api/collections/${cA._id}`)
      .set('Cookie', cookieB)
      .send({ name: 'Hacked Collection' });
    expect(patchForbidden.status).toBe(403);

    // User B tries to delete User A's collection
    const deleteForbidden = await request(app)
      .delete(`/api/collections/${cA._id}`)
      .set('Cookie', cookieB);
    expect(deleteForbidden.status).toBe(403);
  });

  it('10. Move bookmark to collection and filter bookmarks by collection', async () => {
    const coll = await Collection.findOne({ user: userA._id });

    // Move post1 bookmark to this collection
    const moveRes = await request(app)
      .patch(`/api/bookmarks/${post1._id}/collection`)
      .set('Cookie', cookieA)
      .send({ collectionId: coll._id });

    expect(moveRes.status).toBe(200);
    expect(moveRes.body.bookmark.collection._id.toString()).toBe(coll._id.toString());

    // Fetch bookmarks filtered by collectionId
    const collBookmarks = await request(app)
      .get(`/api/bookmarks?collectionId=${coll._id}`)
      .set('Cookie', cookieA);

    expect(collBookmarks.status).toBe(200);
    expect(collBookmarks.body.bookmarks.length).toBe(1);
    expect(collBookmarks.body.bookmarks[0].post._id.toString()).toBe(post1._id.toString());

    // User B tries to query User A collection bookmarks
    const leakAttempt = await request(app)
      .get(`/api/bookmarks?collectionId=${coll._id}`)
      .set('Cookie', cookieB);
    expect(leakAttempt.status).toBe(404);
  });

  it('11. Delete collection: preserves bookmarks by setting collection to null', async () => {
    const coll = await Collection.findOne({ user: userA._id });

    // Delete collection
    const delRes = await request(app)
      .delete(`/api/collections/${coll._id}`)
      .set('Cookie', cookieA);
    expect(delRes.status).toBe(200);

    // Bookmark should still exist in general Saved view
    const saved = await request(app)
      .get('/api/bookmarks')
      .set('Cookie', cookieA);
    expect(saved.status).toBe(200);
    const post1Saved = saved.body.bookmarks.find((b) => b.post._id.toString() === post1._id.toString());
    expect(post1Saved).toBeDefined();
    expect(post1Saved.collection).toBeNull();
  });

  it('12. Deleting a post cascades and removes bookmark reference', async () => {
    // Re-bookmark post2
    await request(app)
      .post('/api/bookmarks')
      .set('Cookie', cookieA)
      .send({ postId: post2._id });

    expect(await Bookmark.countDocuments({ user: userA._id, post: post2._id })).toBe(1);

    // User A deletes post2
    const delPost = await request(app)
      .delete(`/api/posts/${post2._id}`)
      .set('Cookie', cookieA);
    expect(delPost.status).toBe(200);

    // Bookmark should be cleaned up automatically
    const countAfter = await Bookmark.countDocuments({ user: userA._id, post: post2._id });
    expect(countAfter).toBe(0);
  });
});
