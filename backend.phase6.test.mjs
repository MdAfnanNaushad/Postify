import 'dotenv/config';
import request from 'supertest';
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import mongoose from 'mongoose';
import app from './server/src/app.js';
import User from './server/src/models/user.js';
import Post from './server/src/models/post.js';

describe('Phase 6 — Developer Profiles & Technical Identity', () => {
  let userA, userB;
  let cookieA, cookieB;
  let postA1, postA2, postB1;

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
        username: `p6_alice_${ts}`,
        name: 'Alice Dev',
        email: `alice_${ts}@test.com`,
        password: 'Password123!'
      });
    userA = resA.body.user;
    cookieA = resA.headers['set-cookie'][0].split(';')[0];

    // Register User B
    const resB = await request(app)
      .post('/api/auth/register')
      .send({
        username: `p6_bob_${ts}`,
        name: 'Bob Dev',
        email: `bob_${ts}@test.com`,
        password: 'Password123!'
      });
    userB = resB.body.user;
    cookieB = resB.headers['set-cookie'][0].split(';')[0];

    // Create posts
    const p1 = await request(app)
      .post('/api/posts')
      .set('Cookie', cookieA)
      .send({ content: 'Post #1 by Alice' });
    postA1 = p1.body.post;

    const p2 = await request(app)
      .post('/api/posts')
      .set('Cookie', cookieA)
      .send({ content: 'Post #2 by Alice' });
    postA2 = p2.body.post;

    const pb = await request(app)
      .post('/api/posts')
      .set('Cookie', cookieB)
      .send({ content: 'Post by Bob' });
    postB1 = pb.body.post;
  });

  afterAll(async () => {
    if (userA && userB) {
      const userIds = [userA._id, userB._id];
      await Post.deleteMany({ user: { $in: userIds } });
      await User.deleteMany({ _id: { $in: userIds } });
    }
  });

  it('1. Profile Update: Authenticated user can update technical profile fields', async () => {
    const updatePayload = {
      name: 'Alice Updated',
      bio: 'Full-stack distributed systems engineer and open source contributor.',
      location: 'San Francisco, CA',
      website: 'https://alicedev.io',
      github: 'https://github.com/alicedev',
      linkedin: 'https://linkedin.com/in/alicedev',
      techStack: ['Node.js', 'React', 'MongoDB', 'Docker', 'GraphQL'],
      selectedProjects: [
        {
          name: 'Distributed KV Store',
          description: 'A Raft-consensus backed key-value database in Go.',
          techStack: ['Go', 'Raft', 'gRPC'],
          projectUrl: 'https://github.com/alicedev/raft-kv'
        }
      ]
    };

    const res = await request(app)
      .put('/api/users/me')
      .set('Cookie', cookieA)
      .send(updatePayload);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.user.bio).toBe(updatePayload.bio);
    expect(res.body.user.location).toBe(updatePayload.location);
    expect(res.body.user.website).toBe(updatePayload.website);
    expect(res.body.user.techStack).toHaveLength(5);
    expect(res.body.user.selectedProjects).toHaveLength(1);
    expect(res.body.user.selectedProjects[0].name).toBe('Distributed KV Store');
  });

  it('2. URL Validation: Malformed URLs are rejected', async () => {
    const invalidPayload = {
      website: 'not-a-valid-url-format'
    };

    const res = await request(app)
      .put('/api/users/me')
      .set('Cookie', cookieA)
      .send(invalidPayload);

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it('3. Pin Post: User A can pin their own post', async () => {
    const pinRes = await request(app)
      .post(`/api/users/me/pins/${postA1._id}`)
      .set('Cookie', cookieA);

    expect(pinRes.status).toBe(200);
    expect(pinRes.body.success).toBe(true);
    const pinIds = pinRes.body.pinnedPosts.map((p) => (p._id ? p._id.toString() : p.toString()));
    expect(pinIds).toContain(postA1._id.toString());
  });

  it('4. Pin Post: Cannot pin another user\'s post (403 Forbidden)', async () => {
    const roguePinRes = await request(app)
      .post(`/api/users/me/pins/${postB1._id}`)
      .set('Cookie', cookieA);

    expect(roguePinRes.status).toBe(403);
    expect(roguePinRes.body.success).toBe(false);
  });

  it('5. Duplicate Pin Prevention: Attempting to pin an already pinned post is rejected or idempotent', async () => {
    const dupRes = await request(app)
      .post(`/api/users/me/pins/${postA1._id}`)
      .set('Cookie', cookieA);

    expect(dupRes.status).toBe(400);
    expect(dupRes.body.message).toContain('already pinned');
  });

  it('6. Unpin Post: User A can unpin a post', async () => {
    const unpinRes = await request(app)
      .delete(`/api/users/me/pins/${postA1._id}`)
      .set('Cookie', cookieA);

    expect(unpinRes.status).toBe(200);
    expect(unpinRes.body.success).toBe(true);
    expect(unpinRes.body.pinnedPosts).not.toContain(postA1._id);
  });

  it('7. Public Profile Rendering: Populates pinned posts and handles missing optional fields gracefully', async () => {
    // Pin postA2
    await request(app)
      .post(`/api/users/me/pins/${postA2._id}`)
      .set('Cookie', cookieA);

    // Fetch User A's profile publicly
    const profRes = await request(app).get(`/api/users/${userA._id}`);
    expect(profRes.status).toBe(200);
    expect(profRes.body.success).toBe(true);
    expect(profRes.body.user.pinnedPosts).toHaveLength(1);
    expect(profRes.body.user.pinnedPosts[0]._id.toString()).toBe(postA2._id.toString());

    // Fetch User B's profile (which has empty optional fields)
    const profBRes = await request(app).get(`/api/users/${userB._id}`);
    expect(profBRes.status).toBe(200);
    expect(profBRes.body.user.techStack).toBeDefined();
    expect(profBRes.body.user.selectedProjects).toBeDefined();
    expect(profBRes.body.user.pinnedPosts).toBeDefined();
  });

  it('8. Deleted Post Handling: Deleted post is automatically stripped from pinnedPosts without breaking profile', async () => {
    // Delete postA2
    await request(app)
      .delete(`/api/posts/${postA2._id}`)
      .set('Cookie', cookieA);

    // Profile query should cleanly return 0 pinned posts without null crash
    const profRes = await request(app).get(`/api/users/${userA._id}`);
    expect(profRes.status).toBe(200);
    expect(profRes.body.user.pinnedPosts).toHaveLength(0);
  });
});
