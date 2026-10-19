import 'dotenv/config';
import request from 'supertest';
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import mongoose from 'mongoose';
import app from './server/src/app.js';
import Post from './server/src/models/post.js';
import User from './server/src/models/user.js';

describe('Phase 2 — Permanent Post Links, Social Previews & Technical Publishing', () => {
  let samplePostId;
  let testUserId;
  let testPostId;

  beforeAll(async () => {
    const uri = process.env.TEST_MONGODB_URI || 'mongodb://127.0.0.1:27017/miniproject_test';
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(uri);
    }

    // Create an isolated test user and post for Phase 2 tests
    const author = await User.create({
      username: `techauthor_${Date.now()}`,
      name: 'Tech Author',
      email: `techauthor_${Date.now()}@example.com`,
      password: 'HashedPassword123!',
      Profilepic: 'Profilepic.jpg'
    });
    testUserId = author._id;

    const post = await Post.create({
      user: testUserId,
      content: '### Mastering React Server Components\n\nHere is a code snippet:\n```javascript\nconst hello = "world";\nconsole.log(hello);\n```\nCheck out [Postify](https://postify.dev)!',
      date: new Date()
    });
    testPostId = post._id;
  });

  afterAll(async () => {
    if (testPostId) await Post.findByIdAndDelete(testPostId);
    if (testUserId) await User.findByIdAndDelete(testUserId);
    await mongoose.connection.close();
  });

  it('1. GET /api/posts/:id returns full post with author details for canonical post page', async () => {
    const res = await request(app).get(`/api/posts/${testPostId}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.post._id.toString()).toBe(testPostId.toString());
    expect(res.body.post.user).toBeDefined();
    expect(res.body.post.user.name).toBe('Tech Author');
    expect(res.body.post.content).toContain('### Mastering React Server Components');
  });

  it('2. GET /api/posts/:id returns 404 for non-existent post id', async () => {
    const fakeId = new mongoose.Types.ObjectId();
    const res = await request(app).get(`/api/posts/${fakeId}`);
    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toMatch(/not found/i);
  });

  it('3. GET /api/posts/:id returns 404 for malformed/invalid ObjectId', async () => {
    const res = await request(app).get('/api/posts/not-a-valid-id');
    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
  });

  it('4. GET /api/posts/:id/preview returns clean Open Graph social metadata', async () => {
    const res = await request(app).get(`/api/posts/${testPostId}/preview`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.metadata).toBeDefined();
    expect(res.body.metadata.title).toContain('Tech Author');
    expect(res.body.metadata.description).not.toContain('###'); // Markdown stripped from summary
    expect(res.body.metadata.url).toContain(`/post/${testPostId}`);
    expect(res.body.metadata.image).toBeDefined();
  });

  it('5. GET /post/:id with social crawler User-Agent serves server-rendered HTML with Open Graph tags', async () => {
    const res = await request(app)
      .get(`/post/${testPostId}`)
      .set('User-Agent', 'facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)');

    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toMatch(/html/);
    expect(res.text).toContain('<meta property="og:title"');
    expect(res.text).toContain('<meta property="og:description"');
    expect(res.text).toContain('<meta property="og:image"');
    expect(res.text).toContain('<meta name="twitter:card" content="summary_large_image"');
    expect(res.text).toContain(`href="http://localhost:5173/post/${testPostId}"`);
  });

  it('6. GET /post/:id with Twitterbot User-Agent serves server-rendered HTML with Twitter Card', async () => {
    const res = await request(app)
      .get(`/post/${testPostId}`)
      .set('User-Agent', 'Twitterbot/1.0');

    expect(res.status).toBe(200);
    expect(res.text).toContain('<meta name="twitter:card" content="summary_large_image"');
    expect(res.text).toContain('Tech Author on Postify');
  });

  it('7. GET /post/:id with standard browser User-Agent redirects to client SPA route', async () => {
    const res = await request(app)
      .get(`/post/${testPostId}`)
      .set('User-Agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36');

    expect(res.status).toBe(302);
    expect(res.headers.location).toBe(`http://localhost:5173/post/${testPostId}`);
  });

  it('8. GET /post/:id with crawler on non-existent post returns 404 HTML', async () => {
    const fakeId = new mongoose.Types.ObjectId();
    const res = await request(app)
      .get(`/post/${fakeId}`)
      .set('User-Agent', 'facebookexternalhit/1.1');

    expect(res.status).toBe(404);
    expect(res.text).toContain('Post Not Found');
  });
});
