import 'dotenv/config';
import request from 'supertest';
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import mongoose from 'mongoose';
import app from './server/src/app.js';

import { getMongoUri } from './server/src/config/db.js';

describe('Postify Server API Endpoints & Data Preservation', () => {
  let sampleUserId;
  let samplePostId;

  beforeAll(async () => {
    const uri = getMongoUri();
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(uri);
    }
  });

  afterAll(async () => {
    await mongoose.connection.close();
  });

  it('GET /api/health should return status ok', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
  });

  it('GET /api/posts should retrieve existing posts with pagination and author details', async () => {
    const res = await request(app).get('/api/posts');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.posts)).toBe(true);
    expect(res.body.posts.length).toBeGreaterThan(0);

    // Save sample for next tests
    samplePostId = res.body.posts[0]._id;
    if (res.body.posts[0].user) {
      sampleUserId = res.body.posts[0].user._id;
    }
  });

  it('GET /api/posts/:id should retrieve single existing post', async () => {
    if (!samplePostId) return;
    const res = await request(app).get(`/api/posts/${samplePostId}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.post._id).toBe(samplePostId.toString());
  });

  it('GET /api/users/:id should retrieve existing user profile and posts', async () => {
    if (!sampleUserId) return;
    const res = await request(app).get(`/api/users/${sampleUserId}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.user._id).toBe(sampleUserId.toString());
    expect(res.body.user.password).toBeUndefined(); // Password must NEVER be exposed
  });

  it('Static uploads: /uploads/Profilepic.jpg should serve default image', async () => {
    const res = await request(app).get('/uploads/Profilepic.jpg');
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toMatch(/image/);
  });

  it('Static uploads backward-compatible path: /images/uploads/Profilepic.jpg should also serve', async () => {
    const res = await request(app).get('/images/uploads/Profilepic.jpg');
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toMatch(/image/);
  });

  it('POST /api/posts without token should return 401 Unauthorized', async () => {
    const res = await request(app)
      .post('/api/posts')
      .send({ content: 'Unauthorized test post' });
    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it('POST /api/auth/login with wrong credentials should return 401', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'nonexistent_user_9988@test.com', password: 'wrongpassword' });
    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });
});
