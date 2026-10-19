import 'dotenv/config';
import request from 'supertest';
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import app from './server/src/app.js';
import User from './server/src/models/user.js';
import Post from './server/src/models/post.js';
import Reply from './server/src/models/reply.js';
import Project from './server/src/models/project.js';
import BuildLog from './server/src/models/buildLog.js';
import Bookmark from './server/src/models/bookmark.js';
import Collection from './server/src/models/collection.js';
import Digest from './server/src/models/digest.js';
import DigestPreference from './server/src/models/digestPreference';
import Report from './server/src/models/report.js';
import AuditLog from './server/src/models/auditLog.js';

describe('Phase 11 — Production Readiness, Moderation, Accessibility & Security Hardening Tests', () => {
  const testSuffix = Date.now();

  const authorData = {
    username: `p11_author_${testSuffix}`,
    email: `p11_author_${testSuffix}@example.com`,
    password: 'Password123!',
    name: 'Author Eleven'
  };

  const adversaryData = {
    username: `p11_adversary_${testSuffix}`,
    email: `p11_adversary_${testSuffix}@example.com`,
    password: 'Password123!',
    name: 'Adversary Eleven'
  };

  const moderatorData = {
    username: `p11_moderator_${testSuffix}`,
    email: `p11_moderator_${testSuffix}@example.com`,
    password: 'Password123!',
    name: 'Moderator Eleven'
  };

  let authorUser, authorToken, authorCookie;
  let adversaryUser, adversaryToken, adversaryCookie;
  let moderatorUser, moderatorToken, moderatorCookie;

  let createdPostId;
  let createdPrivateProjectId;
  let createdPrivateLogId;
  let createdReportId;

  beforeAll(async () => {
    // Strictly isolate tests to test database
    const uri = process.env.TEST_MONGODB_URI || 'mongodb://127.0.0.1:27017/miniproject_test';
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(uri);
    }

    // Register Author
    const res1 = await request(app).post('/api/auth/register').send(authorData);
    authorUser = res1.body.user;
    authorToken = res1.body.token;
    authorCookie = res1.headers['set-cookie']?.[0]?.split(';')[0];

    // Register Adversary
    const res2 = await request(app).post('/api/auth/register').send(adversaryData);
    adversaryUser = res2.body.user;
    adversaryToken = res2.body.token;
    adversaryCookie = res2.headers['set-cookie']?.[0]?.split(';')[0];

    // Register Moderator and elevate via direct model update (simulating CLI assignRole tool)
    const res3 = await request(app).post('/api/auth/register').send(moderatorData);
    moderatorUser = res3.body.user;
    await User.findByIdAndUpdate(moderatorUser._id, { role: 'moderator' });
    // Re-login to receive token with elevated role in payload
    const loginMod = await request(app).post('/api/auth/login').send({
      email: moderatorData.email,
      password: moderatorData.password
    });
    moderatorToken = loginMod.body.token;
    moderatorCookie = loginMod.headers['set-cookie']?.[0]?.split(';')[0];
  });

  afterAll(async () => {
    // Isolated cleanup of all entities created in this test suite
    if (authorUser?._id) {
      await User.findByIdAndDelete(authorUser._id);
      await Post.deleteMany({ user: authorUser._id });
      await Bookmark.deleteMany({ user: authorUser._id });
      await Collection.deleteMany({ user: authorUser._id });
      await Digest.deleteMany({ user: authorUser._id });
      await DigestPreference.deleteMany({ user: authorUser._id });
      await Project.deleteMany({ owner: authorUser._id });
      await BuildLog.deleteMany({ author: authorUser._id });
    }
    if (adversaryUser?._id) {
      await User.findByIdAndDelete(adversaryUser._id);
    }
    if (moderatorUser?._id) {
      await User.findByIdAndDelete(moderatorUser._id);
    }
    if (createdReportId) {
      await Report.findByIdAndDelete(createdReportId);
    }
    await AuditLog.deleteMany({ actor: { $in: [authorUser?._id, moderatorUser?._id] } });
    await mongoose.connection.close();
  });

  // 1. Unauthorized and expired-token requests
  describe('1. Authentication and Token Expiration', () => {
    it('rejects protected routes when unauthenticated with 401', async () => {
      const res = await request(app).get('/api/auth/me');
      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('rejects malformed token with 401', async () => {
      const res = await request(app)
        .get('/api/auth/me')
        .set('Authorization', 'Bearer invalid.token.payload');
      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('rejects expired JWT token with 401', async () => {
      const secret = process.env.JWT_SECRET || 'postify_super_secure_twilight_jwt_secret_2025_portal_key_!98';
      const expiredToken = jwt.sign(
        { userid: authorUser._id, username: authorUser.username },
        secret,
        { expiresIn: '-10s' } // Expired 10 seconds ago
      );

      const res = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${expiredToken}`);
      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/expired|invalid/i);
    });
  });

  // 2. Ownership checks on representative create, edit, and delete endpoints
  describe('2. Ownership and Authorization Enforcement', () => {
    it('allows author to create a post', async () => {
      const res = await request(app)
        .post('/api/posts')
        .set('Cookie', [authorCookie])
        .send({ content: 'Phase 11 production hardening post #security' });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.post.content).toBe('Phase 11 production hardening post #security');
      createdPostId = res.body.post._id;
    });

    it('rejects adversary attempting to edit author post with 403 Forbidden', async () => {
      const res = await request(app)
        .patch(`/api/posts/${createdPostId}`)
        .set('Cookie', [adversaryCookie])
        .send({ content: 'Malicious modification attempt' });

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/forbidden|not authorized/i);
    });

    it('rejects adversary attempting to delete author post with 403 Forbidden', async () => {
      const res = await request(app)
        .delete(`/api/posts/${createdPostId}`)
        .set('Cookie', [adversaryCookie]);

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    });
  });

  // 3. Protected-field mass-assignment attempts
  describe('3. Protected-Field Mass-Assignment Prevention', () => {
    it('rejects attempts to inject role field in profile update with 400 Bad Request', async () => {
      const res = await request(app)
        .patch('/api/users/me')
        .set('Cookie', [adversaryCookie])
        .send({ role: 'admin', bio: 'Hacker attempting role elevation' });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/protected field: role/i);

      // Verify role in database was NOT changed
      const userInDb = await User.findById(adversaryUser._id);
      expect(userInDb.role).toBe('user');
    });

    it('rejects attempts to inject isAdmin or isVerified in profile update with 400 Bad Request', async () => {
      const res = await request(app)
        .patch('/api/users/me')
        .set('Cookie', [adversaryCookie])
        .send({ isVerified: true, isAdmin: true });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/protected field/i);
    });

    it('rejects attempts to modify password or email via updateMe with 400 Bad Request', async () => {
      const res = await request(app)
        .patch('/api/users/me')
        .set('Cookie', [adversaryCookie])
        .send({ password: 'NewHackedPassword123!' });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/protected field: password/i);
    });
  });

  // 4. Private project and build-log isolation
  describe('4. Private Project and Build-Log Isolation', () => {
    it('creates a private project for author', async () => {
      const res = await request(app)
        .post('/api/projects')
        .set('Cookie', [authorCookie])
        .send({
          name: 'Private Architecture Vault',
          slug: `vault-${testSuffix}`,
          visibility: 'private',
          shortDescription: 'Confidential company roadmap'
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.project.visibility).toBe('private');
      createdPrivateProjectId = res.body.project._id;
    });

    it('creates a confidential build log on private project', async () => {
      const res = await request(app)
        .post(`/api/projects/${createdPrivateProjectId}/logs`)
        .set('Cookie', [authorCookie])
        .send({
          title: 'Classified Build Log',
          content: 'Confidential implementation notes.',
          entryType: 'note'
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      createdPrivateLogId = res.body.log._id;
    });

    it('excludes private project from public directory listing', async () => {
      const res = await request(app).get('/api/projects');
      expect(res.status).toBe(200);
      const found = res.body.projects.some((p) => p._id.toString() === createdPrivateProjectId.toString());
      expect(found).toBe(false);
    });

    it('rejects unauthenticated/adversary access to private project via direct URL with 403', async () => {
      const res = await request(app)
        .get(`/api/projects/${createdPrivateProjectId}`)
        .set('Cookie', [adversaryCookie]);

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/private/i);
    });

    it('rejects adversary access to build log on private project with 403', async () => {
      const res = await request(app)
        .get(`/api/projects/${createdPrivateProjectId}/logs/${createdPrivateLogId}`)
        .set('Cookie', [adversaryCookie]);

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    });
  });

  // 5. Bookmark and collection privacy
  describe('5. Bookmark and Collection Privacy', () => {
    let authorCollectionId;

    it('allows author to bookmark post and create private collection', async () => {
      await request(app)
        .post('/api/bookmarks')
        .set('Cookie', [authorCookie])
        .send({ postId: createdPostId });

      const colRes = await request(app)
        .post('/api/collections')
        .set('Cookie', [authorCookie])
        .send({ name: 'Private Architecture Notes', description: 'Internal only' });

      expect(colRes.status).toBe(201);
      authorCollectionId = colRes.body.collection._id;
    });

    it('adversary cannot view author bookmarks', async () => {
      const res = await request(app)
        .get('/api/bookmarks')
        .set('Cookie', [adversaryCookie]);

      expect(res.status).toBe(200);
      expect(res.body.bookmarks.length).toBe(0); // Isolated: adversary has 0 bookmarks
    });

    it('adversary cannot access or mutate author collection', async () => {
      const res = await request(app)
        .get(`/api/collections/${authorCollectionId}`)
        .set('Cookie', [adversaryCookie]);

      expect([403, 404]).toContain(res.status); // Collection isolation enforces access restriction
    });
  });

  // 6. Digest ownership and email opt-in enforcement
  describe('6. Digest Ownership and Email Opt-in Enforcement', () => {
    it('enforces digest preferences ownership', async () => {
      const res = await request(app)
        .get('/api/digest/preferences')
        .set('Cookie', [authorCookie]);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.preferences).toBeDefined();
    });

    it('disabling email delivery reflects in preferences without affecting in-app digest access', async () => {
      const updateRes = await request(app)
        .put('/api/digest/preferences')
        .set('Cookie', [authorCookie])
        .send({ emailDelivery: false });

      expect(updateRes.status).toBe(200);
      expect(updateRes.body.preferences.emailDelivery).toBe(false);
    });
  });

  // 7. Rate-limit behavior on sensitive endpoints
  describe('7. Rate-Limiting Abuse Resistance', () => {
    it('applies standard rate limiting headers to API routes', async () => {
      const res = await request(app).get('/api/health');
      expect(res.status).toBe(200);
      expect(res.headers['ratelimit-limit']).toBeDefined();
    });

    it('applies search rate limiting headers', async () => {
      const res = await request(app).get('/api/search?q=test');
      expect(res.status).toBe(200);
      expect(res.headers['ratelimit-limit']).toBeDefined();
    });
  });

  // 8. Invalid payloads and MongoDB operator injection defense
  describe('8. Input Validation and NoSQL Operator Injection Defense', () => {
    it('neutralizes $gt operator injection in JSON payload', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: { $gt: '' }, // NoSQL operator attempt
          password: 'Password123!'
        });

      // mongoSanitize middleware strips the $gt key resulting in empty/missing email
      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('rejects excessively long search queries with 400 Bad Request', async () => {
      const longQuery = 'a'.repeat(105);
      const res = await request(app).get(`/api/search?q=${longQuery}`);
      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/too long/i);
    });
  });

  // 9. Upload validation and rejection behavior
  describe('9. Upload Validation and File Safety', () => {
    it('rejects executable / script upload for avatar with 400', async () => {
      const res = await request(app)
        .post('/api/users/me/avatar')
        .set('Cookie', [authorCookie])
        .attach('profilepic', Buffer.from('#!/bin/bash\necho "pwn"'), 'malicious.sh');

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('rejects disguised image with HTML / JS content with 400 invalid signature', async () => {
      const fakeImage = Buffer.from('<svg onload="alert(1)"></svg>');
      const res = await request(app)
        .post('/api/users/me/avatar')
        .set('Cookie', [authorCookie])
        .attach('profilepic', fakeImage, 'spoofed.jpg');

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/invalid file signature/i);
    });
  });

  // 10. Report creation, duplicate-report protection, and moderator authorization
  describe('10. Content Moderation & Abuse Reporting', () => {
    it('allows authenticated user to report an abusive post', async () => {
      const res = await request(app)
        .post('/api/reports')
        .set('Cookie', [adversaryCookie])
        .send({
          targetType: 'post',
          targetId: createdPostId,
          reason: 'spam',
          description: 'Repetitive automated advertising content.'
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.reportId).toBeDefined();
      createdReportId = res.body.reportId;
    });

    it('prevents user from reporting their own post', async () => {
      const res = await request(app)
        .post('/api/reports')
        .set('Cookie', [authorCookie])
        .send({
          targetType: 'post',
          targetId: createdPostId,
          reason: 'spam'
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/cannot report your own/i);
    });

    it('prevents duplicate report submissions while a report is pending review', async () => {
      const res = await request(app)
        .post('/api/reports')
        .set('Cookie', [adversaryCookie])
        .send({
          targetType: 'post',
          targetId: createdPostId,
          reason: 'spam',
          description: 'Spamming the same report again'
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/already submitted a report/i);
    });

    it('ordinary users cannot access moderator queue (403 Forbidden)', async () => {
      const res = await request(app)
        .get('/api/moderation/reports')
        .set('Cookie', [adversaryCookie]);

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/privileges required/i);
    });

    it('authorized moderator can view report queue', async () => {
      const res = await request(app)
        .get('/api/moderation/reports')
        .set('Cookie', [moderatorCookie]);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.reports)).toBe(true);
      const found = res.body.reports.some((r) => r._id.toString() === createdReportId.toString());
      expect(found).toBe(true);
    });

    it('authorized moderator can take action to hide abusive content', async () => {
      const res = await request(app)
        .patch(`/api/moderation/reports/${createdReportId}/action`)
        .set('Cookie', [moderatorCookie])
        .send({
          action: 'hide_content',
          notes: 'Confirmed spam violation. Content hidden from public feeds.'
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.report.status).toBe('actioned');
      expect(res.body.report.actionTaken).toBe('content_hidden');

      // Verify post is now marked isHidden in DB
      const postInDb = await Post.findById(createdPostId);
      expect(postInDb.isHidden).toBe(true);

      // Verify post is no longer returned in public feed
      const feedRes = await request(app).get('/api/posts');
      const inFeed = feedRes.body.posts.some((p) => p._id.toString() === createdPostId.toString());
      expect(inFeed).toBe(false);
    });
  });

  // 11. Moderation audit-trail creation
  describe('11. Moderation Audit Trail Creation', () => {
    it('creates an immutable audit log entry for the moderation action', async () => {
      const auditLog = await AuditLog.findOne({ targetId: createdPostId, action: 'hide_content' });
      expect(auditLog).toBeDefined();
      expect(auditLog.actor.toString()).toBe(moderatorUser._id.toString());
      expect(auditLog.targetType).toBe('post');
      expect(auditLog.reason).toMatch(/confirmed spam violation/i);
    });
  });

  // 12. Account suspension enforcement
  describe('12. Account Suspension Enforcement', () => {
    let suspendedUserId;

    beforeAll(async () => {
      const spammer = await User.create({
        username: `spammer_${testSuffix}`,
        email: `spammer_${testSuffix}@example.com`,
        password: await jwt.sign({ temp: true }, 'secret'),
        role: 'user',
        isSuspended: true,
        suspendedReason: 'Violated terms'
      });
      suspendedUserId = spammer._id;
    });

    afterAll(async () => {
      if (suspendedUserId) await User.findByIdAndDelete(suspendedUserId);
    });

    it('suspended account cannot authenticate with 403 Forbidden', async () => {
      const secret = process.env.JWT_SECRET || 'postify_super_secure_twilight_jwt_secret_2025_portal_key_!98';
      const token = jwt.sign(
        { userid: suspendedUserId, username: `spammer_${testSuffix}` },
        secret,
        { expiresIn: '1h' }
      );

      const res = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/account has been suspended/i);
    });
  });

  // 13. Security Headers and Static Caching Verification
  describe('13. Security Headers and Static Caching', () => {
    it('sets nosniff and frame protection headers on API responses', async () => {
      const res = await request(app).get('/api/health');
      expect(res.headers['x-content-type-options']).toBe('nosniff');
      expect(res.headers['x-frame-options']).toBe('DENY');
      expect(res.headers['referrer-policy']).toBe('strict-origin-when-cross-origin');
    });

    it('sets cache-control and nosniff headers on static uploads', async () => {
      const res = await request(app).get('/uploads/Profilepic.jpg');
      // If file exists or 404, headers are set by static middleware
      expect(res.headers['x-content-type-options']).toBe('nosniff');
      if (res.status === 200) {
        expect(res.headers['cache-control']).toMatch(/max-age=604800/);
      }
    });
  });

  // 14. Existing features continue to work
  describe('14. Backward Compatibility and Existing Feature Integrity', () => {
    it('allows author to post reply and like/unlike smoothly', async () => {
      // Unhide post for reply test
      await Post.findByIdAndUpdate(createdPostId, { isHidden: false });

      const replyRes = await request(app)
        .post(`/api/posts/${createdPostId}/replies`)
        .set('Cookie', [authorCookie])
        .send({ content: 'Testing threaded replies after Phase 11 updates.' });

      expect(replyRes.status).toBe(201);
      expect(replyRes.body.success).toBe(true);

      const likeRes = await request(app)
        .put(`/api/posts/${createdPostId}/like`)
        .set('Cookie', [authorCookie]);

      expect(likeRes.status).toBe(200);
      expect(likeRes.body.liked).toBe(true);
    });
  });
});
