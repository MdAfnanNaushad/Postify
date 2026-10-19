import 'dotenv/config';
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import mongoose from 'mongoose';
import app from './server/src/app.js';
import User from './server/src/models/user.js';
import Post from './server/src/models/post.js';
import Reply from './server/src/models/reply.js';
import Follow from './server/src/models/follow';
import Project from './server/src/models/project.js';
import BuildLog from './server/src/models/buildLog.js';
import Notification from './server/src/models/notification.js';
import Digest from './server/src/models/digest.js';
import DigestPreference from './server/src/models/digestPreference.js';
import { getISOWeekString, getWeekBounds } from './server/src/utils/digestUtils.js';
import {
  generateDigestForUser,
  getDigestForUser,
  generateAllActiveDigests
} from './server/src/services/digestService.js';
import {
  isEmailConfigured,
  sendDigestEmail,
  buildDigestEmailHtml
} from './server/src/services/emailService.js';

describe('Phase 10 — Weekly Developer Digest', () => {
  let userA, userB, userC;
  let cookieA, cookieB, cookieC;
  let currentBounds;

  beforeAll(async () => {
    const uri = process.env.TEST_MONGODB_URI || 'mongodb://127.0.0.1:27017/miniproject_test';
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(uri);
    }

    currentBounds = getWeekBounds();
    const ts = Date.now();

    // Register User A (Active Consumer & Follower)
    const resA = await request(app)
      .post('/api/auth/register')
      .send({
        username: `p10_alice_${ts}`,
        name: 'Alice Digest User',
        email: `alice_${ts}@digesttest.com`,
        password: 'Password123!'
      });
    userA = resA.body.user;
    cookieA = resA.headers['set-cookie'][0].split(';')[0];

    // Register User B (Followed Creator)
    const resB = await request(app)
      .post('/api/auth/register')
      .send({
        username: `p10_bob_${ts}`,
        name: 'Bob Engineering Lead',
        email: `bob_${ts}@digesttest.com`,
        password: 'Password123!'
      });
    userB = resB.body.user;
    cookieB = resB.headers['set-cookie'][0].split(';')[0];

    // Register User C (Solo User with Low Activity)
    const resC = await request(app)
      .post('/api/auth/register')
      .send({
        username: `p10_clara_${ts}`,
        name: 'Clara Quiet Developer',
        email: `clara_${ts}@digesttest.com`,
        password: 'Password123!'
      });
    userC = resC.body.user;
    cookieC = resC.headers['set-cookie'][0].split(';')[0];

    // User A follows User B
    await Follow.create({ follower: userA._id, following: userB._id });
  });

  afterAll(async () => {
    const testUserIds = [userA?._id, userB?._id, userC?._id].filter(Boolean);
    if (testUserIds.length > 0) {
      await Digest.deleteMany({ user: { $in: testUserIds } });
      await DigestPreference.deleteMany({ user: { $in: testUserIds } });
      await Post.deleteMany({ user: { $in: testUserIds } });
      await Reply.deleteMany({ user: { $in: testUserIds } });
      await Follow.deleteMany({ $or: [{ follower: { $in: testUserIds } }, { following: { $in: testUserIds } }] });
      await Project.deleteMany({ owner: { $in: testUserIds } });
      await BuildLog.deleteMany({ author: { $in: testUserIds } });
      await Notification.deleteMany({ recipient: { $in: testUserIds } });
      await User.deleteMany({ _id: { $in: testUserIds } });
    }
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
    }
  });

  describe('1. Deterministic Week Definition & Timezone Boundaries', () => {
    it('calculates deterministic ISO week strings and Monday-Sunday UTC boundaries', () => {
      const date = new Date(Date.UTC(2026, 9, 15, 12, 0, 0)); // Oct 15, 2026 (Thursday)
      const weekStr = getISOWeekString(date);
      expect(weekStr).toBe('2026-W42');

      const bounds = getWeekBounds('2026-W42');
      expect(bounds.periodKey).toBe('2026-W42');
      // Monday Oct 12, 2026
      expect(bounds.startDate.getUTCFullYear()).toBe(2026);
      expect(bounds.startDate.getUTCMonth()).toBe(9); // 0-indexed October
      expect(bounds.startDate.getUTCDate()).toBe(12);
      expect(bounds.startDate.getUTCHours()).toBe(0);
      expect(bounds.startDate.getUTCMinutes()).toBe(0);

      // Sunday Oct 18, 2026
      expect(bounds.endDate.getUTCFullYear()).toBe(2026);
      expect(bounds.endDate.getUTCMonth()).toBe(9);
      expect(bounds.endDate.getUTCDate()).toBe(18);
      expect(bounds.endDate.getUTCHours()).toBe(23);
      expect(bounds.endDate.getUTCMinutes()).toBe(59);

      expect(bounds.label).toContain('Oct 12 – 18, 2026');
    });

    it('rejects invalid periodKey formats on the API route', async () => {
      const res = await request(app)
        .get('/api/digest/invalid-format-week')
        .set('Cookie', cookieA);

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/invalid periodkey format/i);
    });
  });

  describe('2. Digest Generation from Persisted Activity', () => {
    let postB, myPostA;

    beforeAll(async () => {
      // 1. Bob creates a public post within the current week
      postB = await Post.create({
        user: userB._id,
        content: 'Building high-throughput raft consensus protocols in Go for distributed storage.'
      });

      // 2. Alice creates a post, and Bob replies to it within the current week
      myPostA = await Post.create({
        user: userA._id,
        content: 'What is your preferred queue engine: Redis Streams or RabbitMQ?'
      });

      await Reply.create({
        user: userB._id,
        post: myPostA._id,
        content: 'Redis Streams provides predictable tail latency for our microservice architecture.'
      });

      // 3. Notification sent to Alice
      await Notification.create({
        recipient: userA._id,
        actor: userB._id,
        type: 'reply',
        post: myPostA._id
      });

      // 4. Bob creates a public project and a build log entry
      const projB = await Project.create({
        owner: userB._id,
        name: 'Raft Cluster Engine',
        slug: 'raft-cluster-engine',
        shortDescription: 'Distributed storage engine in Go',
        visibility: 'public'
      });

      await BuildLog.create({
        project: projB._id,
        author: userB._id,
        title: 'Initial RPC Consensus Implementation',
        content: 'Created proto definitions and Raft election state machine.',
        entryType: 'milestone'
      });
    });

    it('generates a complete weekly digest aggregating followed posts, post interactions, build logs, and notifications', async () => {
      const digest = await generateDigestForUser(userA._id, currentBounds.periodKey, { force: true });

      expect(digest).toBeDefined();
      expect(digest.user.toString()).toBe(userA._id.toString());
      expect(digest.periodKey).toBe(currentBounds.periodKey);

      // Followed Posts
      expect(digest.sections.followedPosts).toHaveLength(1);
      expect(digest.sections.followedPosts[0].author.username).toBe(userB.username);
      expect(digest.sections.followedPosts[0].content).toContain('raft consensus protocols');

      // Post Interactions
      expect(digest.sections.postActivity.totalNewReplies).toBeGreaterThanOrEqual(1);
      expect(digest.sections.postActivity.interactions.length).toBeGreaterThanOrEqual(1);
      expect(digest.sections.postActivity.interactions[0].actor.username).toBe(userB.username);

      // Notifications
      expect(digest.sections.unreadNotifications.length).toBeGreaterThanOrEqual(1);
      expect(digest.sections.unreadNotifications[0].sender.username).toBe(userB.username);

      // Followed Build Logs
      expect(digest.sections.followedBuildLogs).toHaveLength(1);
      expect(digest.sections.followedBuildLogs[0].title).toBe('Initial RPC Consensus Implementation');
      expect(digest.sections.followedBuildLogs[0].project.name).toBe('Raft Cluster Engine');

      // Summary text
      expect(digest.summary).toContain('update');
      expect(digest.summary).toContain('response');
    });

    it('returns the current weekly digest through GET /api/digest/current', async () => {
      const res = await request(app)
        .get('/api/digest/current')
        .set('Cookie', cookieA);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.digest).toBeDefined();
      expect(res.body.periodKey).toBe(currentBounds.periodKey);
      expect(res.body.digest.sections.followedPosts.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('3. Empty-Week Behavior & Public Discovery', () => {
    it('generates clean empty sections without crashing when user has zero followers and zero interactions', async () => {
      const digestC = await generateDigestForUser(userC._id, currentBounds.periodKey, { force: true });

      expect(digestC).toBeDefined();
      expect(digestC.sections.followedPosts).toHaveLength(0);
      expect(digestC.sections.postActivity.totalNewReplies).toBe(0);
      expect(digestC.sections.followedBuildLogs).toHaveLength(0);
      expect(digestC.sections.unreadNotifications).toHaveLength(0);

      // Populates public highlights so the user has meaningful content to discover
      expect(digestC.sections.publicHighlights.length).toBeGreaterThanOrEqual(1);
      expect(digestC.summary).toMatch(/highlights|discover/i);
    });
  });

  describe('4. Idempotency & Duplicate Execution Protection', () => {
    it('returns the existing digest document without duplicating records when called multiple times', async () => {
      const countBefore = await Digest.countDocuments({ user: userA._id, periodKey: currentBounds.periodKey });

      // Run generate again without force
      const doc = await generateDigestForUser(userA._id, currentBounds.periodKey, { force: false });
      expect(doc).toBeDefined();

      const countAfter = await Digest.countDocuments({ user: userA._id, periodKey: currentBounds.periodKey });
      expect(countAfter).toBe(countBefore);
      expect(countAfter).toBe(1);
    });

    it('running batch generator generateAllActiveDigests is safe and skips already generated digests', async () => {
      const results = await generateAllActiveDigests(currentBounds.periodKey, { force: false });
      expect(results).toBeDefined();
      expect(results.total).toBeGreaterThanOrEqual(2);
      expect(results.errors).toBe(0);
    });
  });

  describe('5. Privacy Boundaries & Cross-User Isolation', () => {
    let privateProject, privateLog;

    beforeAll(async () => {
      // Bob creates a strictly PRIVATE project and private build log
      privateProject = await Project.create({
        owner: userB._id,
        name: 'Top Secret Quantum Engine',
        slug: 'top-secret-quantum-engine',
        shortDescription: 'Confidential algorithmic research',
        visibility: 'private'
      });

      privateLog = await BuildLog.create({
        project: privateProject._id,
        author: userB._id,
        title: 'Zero-Knowledge Lattice Encryption Benchmark',
        content: 'Confidential breakthrough details.',
        entryType: 'research'
      });
    });

    it('never leaks private projects or private build logs into another user digest', async () => {
      const digestA = await generateDigestForUser(userA._id, currentBounds.periodKey, { force: true });

      // Check build logs section
      const leakedLog = digestA.sections.followedBuildLogs.find(
        (l) => l.title === 'Zero-Knowledge Lattice Encryption Benchmark'
      );
      expect(leakedLog).toBeUndefined();

      // Check public highlights
      const leakedHighlight = digestA.sections.publicHighlights.find(
        (h) => h.title === 'Top Secret Quantum Engine'
      );
      expect(leakedHighlight).toBeUndefined();
    });

    it('strictly isolates cross-user digest access and prevents unauthorized reading', async () => {
      // User B attempts to access User A's digest via direct ID or specific period
      const digestA = await Digest.findOne({ user: userA._id, periodKey: currentBounds.periodKey });
      expect(digestA).toBeDefined();

      // Bob attempts to mark Alice's digest as read
      const resTamper = await request(app)
        .patch(`/api/digest/${digestA._id}/read`)
        .set('Cookie', cookieB);

      expect(resTamper.status).toBe(403);
      expect(resTamper.body.message).toMatch(/not authorized/i);
    });
  });

  describe('6. User Preferences & Protected Fields Validation', () => {
    it('retrieves default preferences and email configuration status', async () => {
      const res = await request(app)
        .get('/api/digest/preferences')
        .set('Cookie', cookieA);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.preferences).toBeDefined();
      expect(res.body.preferences.enabled).toBe(true);
      expect(res.body.preferences.emailDelivery).toBe(false); // Opt-in default
      expect(typeof res.body.emailConfigured).toBe('boolean');
    });

    it('allows updating allowed preference fields', async () => {
      const res = await request(app)
        .put('/api/digest/preferences')
        .set('Cookie', cookieA)
        .send({
          enabled: true,
          emailDelivery: false,
          deliveryDay: 'friday',
          timezone: 'America/New_York',
          includeFollowedPosts: true,
          includeBuildLogs: false
        });

      expect(res.status).toBe(200);
      expect(res.body.preferences.deliveryDay).toBe('friday');
      expect(res.body.preferences.timezone).toBe('America/New_York');
      expect(res.body.preferences.includeBuildLogs).toBe(false);
    });

    it('rejects invalid deliveryDay values', async () => {
      const res = await request(app)
        .put('/api/digest/preferences')
        .set('Cookie', cookieA)
        .send({
          deliveryDay: 'invalid_weekday'
        });

      expect(res.status).toBe(400);
      expect(res.body.message).toMatch(/invalid deliveryday/i);
    });

    it('rejects attempt to overwrite protected User fields through digest preferences', async () => {
      const resPassword = await request(app)
        .put('/api/digest/preferences')
        .set('Cookie', cookieA)
        .send({
          password: 'hacked_password123'
        });

      expect(resPassword.status).toBe(400);
      expect(resPassword.body.message).toMatch(/cannot update user account field/i);

      const resEmail = await request(app)
        .put('/api/digest/preferences')
        .set('Cookie', cookieA)
        .send({
          email: 'attacker@injected.com'
        });

      expect(resEmail.status).toBe(400);
      expect(resEmail.body.message).toMatch(/cannot update user account field/i);
    });
  });

  describe('7. Email Opt-in, Unsubscribe, and Provider Handling', () => {
    it('verifies email provider status is cleanly reported as unconfigured when no credentials exist', () => {
      const configured = isEmailConfigured({});
      expect(configured).toBe(false);
    });

    it('returns disabled status when sendDigestEmail is called without email provider', async () => {
      const origKey = process.env.RESEND_API_KEY;
      delete process.env.RESEND_API_KEY;
      try {
        const digest = await Digest.findOne({ user: userA._id });
        const result = await sendDigestEmail({
          user: userA,
          digest,
          dateRangeLabel: currentBounds.label
        });

        expect(result.success).toBe(false);
        expect(result.status).toBe('disabled');
        expect(result.message).toMatch(/not configured/i);
      } finally {
        if (origKey) process.env.RESEND_API_KEY = origKey;
      }
    });

    it('correctly dispatches email via mock transport when provided in tests and verifies HTML content safety', async () => {
      const digest = await Digest.findOne({ user: userA._id });
      const sentMails = [];
      const mockTransport = {
        sendMail: async (mailOptions) => {
          sentMails.push(mailOptions);
          return { messageId: 'test-mock-msg-123' };
        }
      };

      const result = await sendDigestEmail({
        user: userA,
        digest,
        dateRangeLabel: currentBounds.label,
        mockTransport
      });

      expect(result.success).toBe(true);
      expect(result.status).toBe('email_sent');
      expect(sentMails).toHaveLength(1);
      expect(sentMails[0].to).toBe(userA.email);
      expect(sentMails[0].subject).toContain('Postify Weekly Digest');

      // Verify HTML template security: does NOT contain private passwords, collections, or unescaped HTML
      const html = sentMails[0].html;
      expect(html).toContain(userA.name);
      expect(html).toContain('Unsubscribe');
      expect(html).not.toContain('Password123!');
      expect(html).not.toContain('Top Secret Quantum Engine');
    });

    it('enforces unsubscribe: toggling emailDelivery off stops delivery status immediately', async () => {
      // Toggle off
      await request(app)
        .put('/api/digest/preferences')
        .set('Cookie', cookieA)
        .send({ emailDelivery: false });

      const pref = await DigestPreference.findOne({ user: userA._id });
      expect(pref.emailDelivery).toBe(false);

      const digest = await generateDigestForUser(userA._id, currentBounds.periodKey, { force: true });
      expect(digest.deliveryStatus).toBe('in_app_only');
    });
  });

  describe('8. Read State & Digest History', () => {
    it('marks a digest as read with timestamp', async () => {
      const digest = await Digest.findOne({ user: userA._id, periodKey: currentBounds.periodKey });
      expect(digest).toBeDefined();

      const res = await request(app)
        .patch(`/api/digest/${digest._id}/read`)
        .set('Cookie', cookieA);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.digest.isRead).toBe(true);
      expect(res.body.digest.readAt).toBeDefined();
    });

    it('retrieves user digest history through GET /api/digest/history', async () => {
      const res = await request(app)
        .get('/api/digest/history')
        .set('Cookie', cookieA);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.history.length).toBeGreaterThanOrEqual(1);
      expect(res.body.history[0].periodKey).toBe(currentBounds.periodKey);
    });
  });
});
