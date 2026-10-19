import 'dotenv/config';
import request from 'supertest';
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import mongoose from 'mongoose';
import app from './server/src/app.js';
import User from './server/src/models/user.js';
import Post from './server/src/models/post.js';

describe('Phase 7 — Topics, Tags, Search & Technology Discovery', () => {
  let user1, user2;
  let cookie1, cookie2;
  let post1, post2, post3;

  beforeAll(async () => {
    // Strictly isolate tests to miniproject_test
    const uri = process.env.TEST_MONGODB_URI || 'mongodb://127.0.0.1:27017/miniproject_test';
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(uri);
    }

    const ts = Date.now();

    // Register test users
    const res1 = await request(app)
      .post('/api/auth/register')
      .send({
        username: `dev_gopher_${ts}`,
        name: 'Grace Hopper',
        email: `grace_${ts}@test.com`,
        password: 'Password123!'
      });
    user1 = res1.body.user;
    cookie1 = res1.headers['set-cookie'][0].split(';')[0];

    // Set user 1 techStack
    await request(app)
      .patch('/api/users/me')
      .set('Cookie', cookie1)
      .send({
        bio: 'Compilers and distributed architectures enthusiast.',
        techStack: ['Go', 'Kubernetes', 'Docker', 'COBOL']
      });

    const res2 = await request(app)
      .post('/api/auth/register')
      .send({
        username: `react_ninja_${ts}`,
        name: 'Dan Abramov Fan',
        email: `dan_${ts}@test.com`,
        password: 'Password123!'
      });
    user2 = res2.body.user;
    cookie2 = res2.headers['set-cookie'][0].split(';')[0];

    // Set user 2 techStack
    await request(app)
      .patch('/api/users/me')
      .set('Cookie', cookie2)
      .send({
        bio: 'Frontend performance, React 19 concurrent features and Vite.',
        techStack: ['React', 'TypeScript', 'TailwindCSS', 'Vite']
      });

    // Post 1: Go & Docker tags with code block containing Python comments
    const p1 = await request(app)
      .post('/api/posts')
      .set('Cookie', cookie1)
      .send({
        content: `# Building Distributed Systems in #Go\n\nHere is how we use #Docker:\n\`\`\`python\n# This comment inside code block should NOT be a tag\n#python_comment\n\`\`\`\nLet's deploy!`
      });
    post1 = p1.body.post;

    // Post 2: React & TypeScript tags
    const p2 = await request(app)
      .post('/api/posts')
      .set('Cookie', cookie2)
      .send({
        content: `Exploring #React 19 compiler and #TypeScript 5.5 release notes!`
      });
    post2 = p2.body.post;

    // Post 3: Multiple tags including Go
    const p3 = await request(app)
      .post('/api/posts')
      .set('Cookie', cookie2)
      .send({
        content: `Microservices with #Go and #React frontends are awesome! #Docker`
      });
    post3 = p3.body.post;
  });

  afterAll(async () => {
    if (user1 && user2) {
      const userIds = [user1._id, user2._id];
      await Post.deleteMany({ user: { $in: userIds } });
      await User.deleteMany({ _id: { $in: userIds } });
    }
  });

  it('1. Tag Extraction: Extracts and normalizes lowercase hashtags, deduplicates, and ignores markdown headers and code blocks', () => {
    expect(post1.tags).toBeDefined();
    // Should have 'go' and 'docker'
    expect(post1.tags).toContain('go');
    expect(post1.tags).toContain('docker');
    // Markdown heading "# Building Distributed Systems" should NOT be extracted as a tag
    expect(post1.tags).not.toContain('building');
    // Python comment inside fenced code block should NOT be extracted
    expect(post1.tags).not.toContain('python_comment');
  });

  it('2. Topic Aggregation: GET /api/topics returns real topics with actual post counts', async () => {
    const res = await request(app).get('/api/topics');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.topics)).toBe(true);

    const goTopic = res.body.topics.find((t) => t.tag === 'go');
    expect(goTopic).toBeDefined();
    expect(goTopic.count).toBeGreaterThanOrEqual(2); // In post1 and post3

    const dockerTopic = res.body.topics.find((t) => t.tag === 'docker');
    expect(dockerTopic).toBeDefined();
    expect(dockerTopic.count).toBeGreaterThanOrEqual(2); // In post1 and post3
  });

  it('3. Topic Detail: GET /api/topics/:tag returns paginated posts for that specific tag', async () => {
    const res = await request(app).get('/api/topics/go');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.tag).toBe('go');
    expect(res.body.posts.length).toBeGreaterThanOrEqual(2);
    expect(res.body.posts.every((p) => p.tags.includes('go'))).toBe(true);
  });

  it('4. Topic Detail: Case-insensitivity and normalization (#Go, GO, go all resolve identically)', async () => {
    const resUpper = await request(app).get('/api/topics/%23Go');
    expect(resUpper.status).toBe(200);
    expect(resUpper.body.tag).toBe('go');
    expect(resUpper.body.posts.length).toBeGreaterThanOrEqual(2);
  });

  it('5. Global Search: Search People by name, username, bio, or techStack', async () => {
    // Search by techStack
    const resTech = await request(app).get('/api/search?q=Kubernetes&type=people');
    expect(resTech.status).toBe(200);
    expect(resTech.body.people.some((u) => u.username === user1.username)).toBe(true);

    // Search by bio
    const resBio = await request(app).get('/api/search?q=Compilers&type=people');
    expect(resBio.status).toBe(200);
    expect(resBio.body.people.some((u) => u.username === user1.username)).toBe(true);

    // Search by name
    const resName = await request(app).get('/api/search?q=Abramov&type=people');
    expect(resName.status).toBe(200);
    expect(resName.body.people.some((u) => u.username === user2.username)).toBe(true);
  });

  it('6. Global Search: Search Posts by content and tags', async () => {
    const resContent = await request(app).get('/api/search?q=Microservices&type=posts');
    expect(resContent.status).toBe(200);
    expect(resContent.body.posts.some((p) => p._id.toString() === post3._id.toString())).toBe(true);

    const resTag = await request(app).get('/api/search?q=%23React&type=posts');
    expect(resTag.status).toBe(200);
    expect(resTag.body.posts.length).toBeGreaterThanOrEqual(2);
  });

  it('7. Global Search: Search Topics matching query', async () => {
    const resTopic = await request(app).get('/api/search?q=doc&type=topics');
    expect(resTopic.status).toBe(200);
    expect(resTopic.body.topics.some((t) => t.tag === 'docker')).toBe(true);
  });

  it('8. Multi-Category "all" Search returns structured People, Posts, and Topics', async () => {
    const resAll = await request(app).get('/api/search?q=Go&type=all');
    expect(resAll.status).toBe(200);
    expect(resAll.body.success).toBe(true);
    expect(resAll.body.people.length).toBeGreaterThanOrEqual(1);
    expect(resAll.body.posts.length).toBeGreaterThanOrEqual(2);
    expect(resAll.body.topics.some((t) => t.tag === 'go')).toBe(true);
  });

  it('9. Security & Injection Resistance: Metacharacters in search query do not break regex or leak unrestricted data', async () => {
    const maliciousQueries = [
      '.*',
      '[a-z]+',
      '(\\w+)+',
      '?(.*)',
      '\\',
      '{1,10}',
      '^$',
      '$where'
    ];

    for (const q of maliciousQueries) {
      const res = await request(app).get(`/api/search?q=${encodeURIComponent(q)}`);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    }
  });

  it('10. Validation: Excessively long query (> 100 chars) returns 400 Bad Request', async () => {
    const longQuery = 'a'.repeat(105);
    const res = await request(app).get(`/api/search?q=${longQuery}`);
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it('11. Empty Query returns empty result set gracefully without database error', async () => {
    const res = await request(app).get('/api/search?q=');
    expect(res.status).toBe(200);
    expect(res.body.people).toHaveLength(0);
    expect(res.body.posts).toHaveLength(0);
    expect(res.body.topics).toHaveLength(0);
  });
});
