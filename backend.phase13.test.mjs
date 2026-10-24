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
import Report from './server/src/models/report.js';
import AuditLog from './server/src/models/auditLog.js';
import Digest from './server/src/models/digest.js';

describe('Phase 13 — Admin Control Center, Security, Analytics & Moderation Tests', () => {
  const testSuffix = Date.now();

  const regularUserData = {
    username: `p13_user_${testSuffix}`,
    email: `p13_user_${testSuffix}@example.com`,
    password: 'Password123!',
    name: 'Regular Developer'
  };

  const moderatorUserData = {
    username: `p13_mod_${testSuffix}`,
    email: `p13_mod_${testSuffix}@example.com`,
    password: 'Password123!',
    name: 'Platform Moderator'
  };

  const bootstrapAdminEmail = process.env.ADMIN_EMAIL || `admin_${testSuffix}@postify.dev`;
  const bootstrapAdminPassword = process.env.ADMIN_PASSWORD || `admin_pass_${testSuffix}`;

  let regularUser, regularToken, regularCookie;
  let moderatorUser, moderatorToken, moderatorCookie;
  let adminUser, adminToken, adminCookie;
  let samplePost, sampleReport;

  beforeAll(async () => {
    // Strictly isolate tests to test database
    const uri = process.env.TEST_MONGODB_URI || 'mongodb://127.0.0.1:27017/miniproject_test';
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(uri);
    }

    // Ensure environment variables for bootstrap admin in test runner
    process.env.ADMIN_EMAIL = bootstrapAdminEmail;
    process.env.ADMIN_PASSWORD = bootstrapAdminPassword;
    process.env.ADMIN_ROUTE = process.env.ADMIN_ROUTE || 'x335/admin/login';

    // 1. Register Regular User
    const regRes = await request(app).post('/api/auth/register').send(regularUserData);
    regularUser = regRes.body.user;
    regularToken = regRes.body.token;
    regularCookie = regRes.headers['set-cookie'];

    // 2. Register Moderator User and set role
    const modRes = await request(app).post('/api/auth/register').send(moderatorUserData);
    moderatorToken = modRes.body.token;
    moderatorCookie = modRes.headers['set-cookie'];
    await User.findByIdAndUpdate(modRes.body.user.id || modRes.body.user._id, { role: 'moderator' });
    moderatorUser = await User.findById(modRes.body.user.id || modRes.body.user._id);

    // 3. Create Sample Post by Regular User
    samplePost = await Post.create({
      user: regularUser._id || regularUser.id,
      content: 'Sample post for admin moderation testing #vite #react',
      tags: ['vite', 'react']
    });

    // 4. Create Sample Report
    sampleReport = await Report.create({
      reporter: regularUser._id || regularUser.id,
      targetType: 'post',
      targetId: samplePost._id,
      reason: 'spam',
      description: 'Automated test report'
    });
  });

  afterAll(async () => {
    // Cleanup created test records in miniproject_test
    if (samplePost) await Post.findByIdAndDelete(samplePost._id);
    if (sampleReport) await Report.findByIdAndDelete(sampleReport._id);
    if (regularUser) await User.findByIdAndDelete(regularUser._id || regularUser.id);
    if (moderatorUser) await User.findByIdAndDelete(moderatorUser._id);
    if (adminUser) await User.findByIdAndDelete(adminUser._id);
  });

  describe('1. Administrator Authentication & Route Verification', () => {
    it('rejects admin login when email or password is missing', async () => {
      const res = await request(app)
        .post('/api/admin/auth/login')
        .send({ email: '' });
      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('rejects admin login with invalid password', async () => {
      const res = await request(app)
        .post('/api/admin/auth/login')
        .send({
          email: bootstrapAdminEmail,
          password: 'wrong_password_123'
        });
      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/invalid/i);
    });

    it('authenticates valid bootstrap administrator and issues secure cookies', async () => {
      const res = await request(app)
        .post('/api/admin/auth/login')
        .send({
          email: bootstrapAdminEmail,
          password: bootstrapAdminPassword
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.admin).toBeDefined();
      expect(res.body.admin.role).toBe('admin');
      expect(res.body.token).toBeDefined();

      adminToken = res.body.token;
      adminCookie = res.headers['set-cookie'];
      expect(adminCookie).toBeDefined();

      adminUser = await User.findOne({ email: bootstrapAdminEmail.toLowerCase() });
      expect(adminUser).not.toBeNull();
      expect(adminUser.role).toBe('admin');
    });

    it('returns active admin session with GET /api/admin/auth/session', async () => {
      const res = await request(app)
        .get('/api/admin/auth/session')
        .set('Cookie', adminCookie);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.admin.email).toBe(bootstrapAdminEmail.toLowerCase());
      expect(res.body.admin.role).toBe('admin');
    });

    it('POST /api/admin/auth/verify-route correctly validates route without revealing secret path', async () => {
      const validRes = await request(app)
        .post('/api/admin/auth/verify-route')
        .send({ path: process.env.ADMIN_ROUTE });
      expect(validRes.status).toBe(200);
      expect(validRes.body.valid).toBe(true);

      const invalidRes = await request(app)
        .post('/api/admin/auth/verify-route')
        .send({ path: '/unrelated-public-path' });
      expect(invalidRes.status).toBe(200);
      expect(invalidRes.body.valid).toBe(false);
    });

    it('ends admin session cleanly with POST /api/admin/auth/logout', async () => {
      const res = await request(app)
        .post('/api/admin/auth/logout')
        .set('Cookie', adminCookie);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });

  describe('2. Server-side Authorization & Access Boundary', () => {
    it('denies unauthenticated access to /api/admin/dashboard with 401', async () => {
      const res = await request(app).get('/api/admin/dashboard');
      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('denies regular authenticated user access to /api/admin/dashboard with 403 Forbidden', async () => {
      const res = await request(app)
        .get('/api/admin/dashboard')
        .set('Cookie', regularCookie);
      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/privileges required/i);
    });

    it('denies moderator access to admin-only endpoint /api/admin/dashboard with 403 Forbidden', async () => {
      const res = await request(app)
        .get('/api/admin/dashboard')
        .set('Cookie', moderatorCookie);
      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    });

    it('prevents regular users from executing role modification on /api/admin/users/:id/role', async () => {
      const res = await request(app)
        .patch(`/api/admin/users/${regularUser._id || regularUser.id}/role`)
        .set('Cookie', regularCookie)
        .send({ role: 'admin', reason: 'Attempted self escalation' });
      expect(res.status).toBe(403);
    });

    it('prevents administrator from suspending their own account (safety guard)', async () => {
      const res = await request(app)
        .patch(`/api/admin/users/${adminUser._id}/suspend`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ isSuspended: true, reason: 'Test accidental self suspension' });
      expect(res.status).toBe(400);
      expect(res.body.message).toMatch(/cannot suspend your own/i);
    });

    it('prevents administrator from demoting their own role (safety guard)', async () => {
      const res = await request(app)
        .patch(`/api/admin/users/${adminUser._id}/role`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ role: 'user', reason: 'Test accidental self demotion' });
      expect(res.status).toBe(400);
      expect(res.body.message).toMatch(/cannot demote your own/i);
    });
  });

  describe('3. Database Aggregations & Dashboard KPIs', () => {
    it('returns authentic database KPIs on GET /api/admin/dashboard', async () => {
      const res = await request(app)
        .get('/api/admin/dashboard')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      const d = res.body.data;
      expect(d.community).toBeDefined();
      expect(typeof d.community.totalUsers).toBe('number');
      expect(d.community.totalUsers).toBeGreaterThanOrEqual(1);

      expect(d.content).toBeDefined();
      expect(typeof d.content.totalPosts).toBe('number');
      expect(d.content.totalPosts).toBeGreaterThanOrEqual(1);

      expect(d.engagement).toBeDefined();
      expect(typeof d.engagement.totalLikes).toBe('number');
      expect(d.engagement.engagementFormula).toBeDefined();

      expect(d.trustAndSafety).toBeDefined();
      expect(typeof d.trustAndSafety.openReports).toBe('number');

      expect(d.system).toBeDefined();
      expect(d.system.databaseStatus).toBe('connected');

      // Ensure zero credentials or secret keys are exposed
      const jsonString = JSON.stringify(res.body);
      expect(jsonString).not.toContain(bootstrapAdminPassword);
      expect(jsonString).not.toContain(process.env.JWT_SECRET);
    });

    it('returns live activity timeline on GET /api/admin/activity', async () => {
      const res = await request(app)
        .get('/api/admin/activity')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.activities)).toBe(true);
    });

    it('returns time-series community growth data on GET /api/admin/analytics/community', async () => {
      const res = await request(app)
        .get('/api/admin/analytics/community?range=30d')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.series)).toBe(true);
    });

    it('returns content creation time-series on GET /api/admin/analytics/content', async () => {
      const res = await request(app)
        .get('/api/admin/analytics/content?range=7d')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.series)).toBe(true);
      expect(Array.isArray(res.body.distribution)).toBe(true);
    });

    it('returns engagement trends on GET /api/admin/analytics/engagement', async () => {
      const res = await request(app)
        .get('/api/admin/analytics/engagement?range=30d')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.distribution)).toBe(true);
    });

    it('returns moderation trends on GET /api/admin/analytics/moderation', async () => {
      const res = await request(app)
        .get('/api/admin/analytics/moderation?range=30d')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.byStatus)).toBe(true);
    });
  });

  describe('4. Community & Content Management Operations', () => {
    it('returns paginated users on GET /api/admin/users', async () => {
      const res = await request(app)
        .get('/api/admin/users?page=1&limit=10')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.users)).toBe(true);
      expect(res.body.total).toBeGreaterThanOrEqual(1);
    });

    it('returns full user detail and stats on GET /api/admin/users/:id', async () => {
      const res = await request(app)
        .get(`/api/admin/users/${regularUser._id || regularUser.id}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.user).toBeDefined();
      expect(res.body.stats).toBeDefined();
      expect(typeof res.body.stats.postsCount).toBe('number');
    });

    it('suspends a user and creates an audit log entry', async () => {
      const res = await request(app)
        .patch(`/api/admin/users/${regularUser._id || regularUser.id}/suspend`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          isSuspended: true,
          reason: 'Automated test suspension'
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.user.isSuspended).toBe(true);

      const userInDb = await User.findById(regularUser._id || regularUser.id);
      expect(userInDb.isSuspended).toBe(true);

      const audit = await AuditLog.findOne({
        targetType: 'user',
        targetId: regularUser._id || regularUser.id,
        action: 'suspend_user'
      });
      expect(audit).not.toBeNull();
      expect(audit.reason).toBe('Automated test suspension');
    });

    it('reinstates a suspended user and creates an audit log entry', async () => {
      const res = await request(app)
        .patch(`/api/admin/users/${regularUser._id || regularUser.id}/suspend`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          isSuspended: false,
          reason: 'Reinstated during automated test'
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.user.isSuspended).toBe(false);

      const userInDb = await User.findById(regularUser._id || regularUser.id);
      expect(userInDb.isSuspended).toBe(false);
    });

    it('manually assigns verification and custom badge to a user with audit trail', async () => {
      const res = await request(app)
        .patch(`/api/admin/users/${regularUser._id || regularUser.id}/badge`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          isVerified: true,
          badgeTitle: 'Core Contributor',
          reason: 'Manual badge assignment test'
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.user.isVerified).toBe(true);
      expect(res.body.user.badgeTitle).toBe('Core Contributor');

      const userInDb = await User.findById(regularUser._id || regularUser.id);
      expect(userInDb.isVerified).toBe(true);
      expect(userInDb.badgeTitle).toBe('Core Contributor');

      const audit = await AuditLog.findOne({
        targetType: 'user',
        targetId: regularUser._id || regularUser.id,
        action: 'grant_badge'
      });
      expect(audit).not.toBeNull();
      expect(audit.reason).toBe('Manual badge assignment test');
    });

    it('soft-hides a post and records audit trail', async () => {
      const res = await request(app)
        .patch(`/api/admin/posts/${samplePost._id}/visibility`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          isHidden: true,
          reason: 'Soft-hidden during test'
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.post.isHidden).toBe(true);

      const postInDb = await Post.findById(samplePost._id);
      expect(postInDb.isHidden).toBe(true);
    });

    it('restores a soft-hidden post', async () => {
      const res = await request(app)
        .patch(`/api/admin/posts/${samplePost._id}/visibility`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          isHidden: false,
          reason: 'Restored during test'
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.post.isHidden).toBe(false);
    });
  });

  describe('5. Moderation Queue & Report Execution', () => {
    it('returns reports list on GET /api/admin/reports', async () => {
      const res = await request(app)
        .get('/api/admin/reports')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.reports)).toBe(true);
    });

    it('resolves single report details with populated target on GET /api/admin/reports/:id', async () => {
      const res = await request(app)
        .get(`/api/admin/reports/${sampleReport._id}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.report._id.toString()).toBe(sampleReport._id.toString());
      expect(res.body.targetContent).toBeDefined();
    });

    it('executes moderation action on a report and updates status', async () => {
      const res = await request(app)
        .patch(`/api/admin/reports/${sampleReport._id}/action`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          action: 'dismiss',
          notes: 'Dismissed during automated test verification'
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.report.status).toBe('dismissed');

      const repInDb = await Report.findById(sampleReport._id);
      expect(repInDb.status).toBe('dismissed');
    });

    it('returns audit logs on GET /api/admin/audit-logs', async () => {
      const res = await request(app)
        .get('/api/admin/audit-logs')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.logs)).toBe(true);
      expect(res.body.total).toBeGreaterThanOrEqual(1);
    });
  });

  describe('6. System Health, Traffic Telemetry & Safe Config Checklist', () => {
    it('returns system health metrics on GET /api/admin/system/health', async () => {
      const res = await request(app)
        .get('/api/admin/system/health')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.health.application).toBeDefined();
      expect(res.body.health.database.status).toBe('connected');
      expect(typeof res.body.health.application.uptimeSeconds).toBe('number');
    });

    it('returns API traffic telemetry on GET /api/admin/system/traffic', async () => {
      const res = await request(app)
        .get('/api/admin/system/traffic')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.telemetry.totalRequests).toBeGreaterThanOrEqual(1);
      expect(res.body.telemetry.latency).toBeDefined();
    });

    it('returns background jobs status on GET /api/admin/system/jobs', async () => {
      const res = await request(app)
        .get('/api/admin/system/jobs')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.jobType).toBeDefined();
    });

    it('returns email deliveries observability on GET /api/admin/system/email-deliveries', async () => {
      const res = await request(app)
        .get('/api/admin/system/email-deliveries')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.statusSummary).toBeDefined();
    });

    it('returns configuration status checklist with safe booleans and ZERO secret values', async () => {
      const res = await request(app)
        .get('/api/admin/system/config-status')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.configuration)).toBe(true);

      res.body.configuration.forEach((item) => {
        expect(typeof item.configured).toBe('boolean');
        expect(item.key).toBeDefined();
        // Crucial security check: item must not contain sensitive values
        expect(item.value).toBeUndefined();
      });

      const bodyStr = JSON.stringify(res.body);
      expect(bodyStr).not.toContain(bootstrapAdminPassword);
      expect(bodyStr).not.toContain(process.env.JWT_SECRET);
    });
  });
});
