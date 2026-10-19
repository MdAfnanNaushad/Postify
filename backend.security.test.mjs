import 'dotenv/config';
import request from 'supertest';
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import mongoose from 'mongoose';
import app from './server/src/app.js';
import User from './server/src/models/user.js';
import Post from './server/src/models/post.js';

describe('Postify Comprehensive Backend Security & Mutation Tests (Isolated)', () => {
  let user1Token;
  let user1Id;
  let user1Cookie;
  let user2Token;
  let user2Id;
  let user2Cookie;
  let createdPostId;

  // Use isolated test identifiers with unique timestamp to protect existing production data
  const testSuffix = Date.now();
  const testUser1 = {
    username: `testauthor_${testSuffix}`,
    email: `author_${testSuffix}@example.com`,
    password: 'Password123!',
    name: 'Author One'
  };

  const testUser2 = {
    username: `testadversary_${testSuffix}`,
    email: `adversary_${testSuffix}@example.com`,
    password: 'Password123!',
    name: 'Adversary Two'
  };

  beforeAll(async () => {
    const uri = process.env.TEST_MONGODB_URI || 'mongodb://127.0.0.1:27017/miniproject_test';
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(uri);
    }
  });

  afterAll(async () => {
    // Clean up created test users and test post only (isolated cleanup)
    if (user1Id) await User.findByIdAndDelete(user1Id);
    if (user2Id) await User.findByIdAndDelete(user2Id);
    if (createdPostId) await Post.findByIdAndDelete(createdPostId);
    await mongoose.connection.close();
  });

  it('1. Register test author and receive HTTP-only cookie and token', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send(testUser1);

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.token).toBeDefined();
    expect(res.body.user.email).toBe(testUser1.email.toLowerCase());

    user1Token = res.body.token;
    user1Id = res.body.user._id;

    // Verify Set-Cookie header is HTTP-Only
    const cookies = res.headers['set-cookie'];
    expect(cookies).toBeDefined();
    expect(cookies.some((c) => c.includes('HttpOnly'))).toBe(true);
    user1Cookie = cookies[0].split(';')[0];
  });

  it('2. Register second user (for adversarial authorization testing)', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send(testUser2);

    expect(res.status).toBe(201);
    user2Token = res.body.token;
    user2Id = res.body.user._id;
    const cookies = res.headers['set-cookie'];
    user2Cookie = cookies[0].split(';')[0];
  });

  it('3. Authenticated session restoration: GET /api/auth/me using HTTP-only cookie', async () => {
    const res = await request(app)
      .get('/api/auth/me')
      .set('Cookie', [user1Cookie]);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.user._id.toString()).toBe(user1Id.toString());
  });

  it('4. Authenticated post creation: Author publishes a post and user-post reference updates', async () => {
    const res = await request(app)
      .post('/api/posts')
      .set('Cookie', [user1Cookie])
      .send({ content: 'Authentic twilight editorial essay.' });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.post.content).toBe('Authentic twilight editorial essay.');
    createdPostId = res.body.post._id;

    // Verify reference exists in author's posts array
    const authorDoc = await User.findById(user1Id);
    expect(authorDoc.posts.map((id) => id.toString())).toContain(createdPostId.toString());
  });

  it('5. SECURITY: Adversary user cannot edit author\'s post (403 Forbidden)', async () => {
    const res = await request(app)
      .patch(`/api/posts/${createdPostId}`)
      .set('Cookie', [user2Cookie])
      .send({ content: 'Malicious modification by adversary.' });

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toMatch(/Forbidden/i);

    // Verify content remained unchanged
    const postDoc = await Post.findById(createdPostId);
    expect(postDoc.content).toBe('Authentic twilight editorial essay.');
  });

  it('6. SECURITY: Adversary user cannot delete author\'s post (403 Forbidden)', async () => {
    const res = await request(app)
      .delete(`/api/posts/${createdPostId}`)
      .set('Cookie', [user2Cookie]);

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);

    // Verify post still exists in DB
    const postDoc = await Post.findById(createdPostId);
    expect(postDoc).not.toBeNull();
  });

  it('7. Idempotent likes & unlikes', async () => {
    // Like post
    const likeRes1 = await request(app)
      .put(`/api/posts/${createdPostId}/like`)
      .set('Cookie', [user2Cookie]);

    expect(likeRes1.status).toBe(200);
    expect(likeRes1.body.liked).toBe(true);
    expect(likeRes1.body.likesCount).toBe(1);

    // Like again (Idempotency test: should not duplicate like)
    const likeRes2 = await request(app)
      .put(`/api/posts/${createdPostId}/like`)
      .set('Cookie', [user2Cookie]);

    expect(likeRes2.status).toBe(200);
    expect(likeRes2.body.likesCount).toBe(1);

    // Unlike post
    const unlikeRes = await request(app)
      .delete(`/api/posts/${createdPostId}/like`)
      .set('Cookie', [user2Cookie]);

    expect(unlikeRes.status).toBe(200);
    expect(unlikeRes.body.liked).toBe(false);
    expect(unlikeRes.body.likesCount).toBe(0);
  });

  it('8. Author can update their own post', async () => {
    const res = await request(app)
      .patch(`/api/posts/${createdPostId}`)
      .set('Cookie', [user1Cookie])
      .send({ content: 'Updated reflection by the legitimate author.' });

    expect(res.status).toBe(200);
    expect(res.body.post.content).toBe('Updated reflection by the legitimate author.');
  });

  it('9. Author can delete their own post and user-post reference cleans up', async () => {
    const res = await request(app)
      .delete(`/api/posts/${createdPostId}`)
      .set('Cookie', [user1Cookie]);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    // Verify deleted from posts collection
    const postDoc = await Post.findById(createdPostId);
    expect(postDoc).toBeNull();

    // Verify reference removed from user's posts array
    const authorDoc = await User.findById(user1Id);
    expect(authorDoc.posts.map((id) => id.toString())).not.toContain(createdPostId.toString());
  });

  it('10. Avatar upload rejects non-image executable/script file', async () => {
    const res = await request(app)
      .post('/api/users/me/avatar')
      .set('Cookie', [user1Cookie])
      .attach('profilepic', Buffer.from('malicious payload'), 'exploit.sh');

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it('11. Avatar upload rejects spoofed extension with fake magic bytes', async () => {
    // Malicious file disguised as image.jpg with non-image bytes
    const fakeImageBuffer = Buffer.from('<html><script>alert("xss")</script></html>');
    const res = await request(app)
      .post('/api/users/me/avatar')
      .set('Cookie', [user1Cookie])
      .attach('profilepic', fakeImageBuffer, 'spoofed.jpg');

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toMatch(/Invalid file signature/i);
  });

  it('12. CSRF Defense: Blocks mutation request from untrusted origin', async () => {
    const res = await request(app)
      .post('/api/posts')
      .set('Cookie', [user1Cookie])
      .set('Origin', 'http://malicious-attacker-site.com')
      .send({ content: 'CSRF attack attempt' });

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toMatch(/untrusted origin/i);
  });
});
