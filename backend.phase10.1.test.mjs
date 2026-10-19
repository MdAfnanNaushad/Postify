/**
 * Phase 10.1 — Resend Email Delivery Integration Tests
 * 
 * Comprehensive automated test suite validating:
 * 1. Successful Resend request using a mocked SDK
 * 2. Resend returning an API error
 * 3. Network or SDK exception handling
 * 4. Missing RESEND_API_KEY handling
 * 5. Missing RESEND_FROM_EMAIL handling
 * 6. User with emailDelivery: false (strictly opt-in)
 * 7. Digest feature disabled for user (enabled: false)
 * 8. Idempotency & duplicate protection after repeated execution
 * 9. Concurrent/overlapping send protection
 * 10. Confirmed failure and bounded retry policy (max 3 attempts)
 * 11. Ambiguous timeout handling preventing blind duplicate sends
 * 12. HTML escaping and XSS defense
 * 13. Unsafe URL rejection (javascript:, data:, etc.)
 * 14. Private project and private build-log exclusion
 * 15. Individual recipient failure isolation in batch processing
 * 16. In-app digest availability when Resend is unconfigured
 * 17. Email preference changes respected at send time
 * 
 * Safety: Strictly uses miniproject_test. Never mutates production miniproject.
 */

import 'dotenv/config';
import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import mongoose from 'mongoose';
import request from 'supertest';
import app from './server/src/app.js';
import User from './server/src/models/user.js';
import Post from './server/src/models/post.js';
import Project from './server/src/models/project.js';
import BuildLog from './server/src/models/buildLog.js';
import Follow from './server/src/models/follow.js';
import Digest from './server/src/models/digest.js';
import DigestPreference from './server/src/models/digestPreference.js';
import {
  isEmailConfigured,
  getEmailConfig,
  escapeHtml,
  sanitizeUrl,
  isTimeoutError,
  buildDigestEmailHtml,
  buildDigestEmailText,
  sendDigestEmail
} from './server/src/services/emailService.js';
import {
  generateDigestForUser,
  generateAllActiveDigests
} from './server/src/services/digestService.js';
import { getWeekBounds } from './server/src/utils/digestUtils.js';

const TEST_DB_URI = 'mongodb://127.0.0.1:27017/miniproject_test';

describe('Phase 10.1 — Resend Email Delivery Integration', () => {
  let userA, userB, userC;
  let cookieA, cookieB;
  let currentBounds;

  beforeAll(async () => {
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(TEST_DB_URI);
    }

    currentBounds = getWeekBounds();

    // Clean test collection artifacts
    await Digest.deleteMany({ periodKey: currentBounds.periodKey });
    await DigestPreference.deleteMany({});
    await User.deleteMany({ email: /@resend-test\.io$/ });

    const ts = Date.now();

    // Register User A (Opted-in to email digest)
    const resA = await request(app)
      .post('/api/auth/register')
      .send({
        name: 'Ada Lovelace',
        username: `ada_${ts}`,
        email: `ada_${ts}@resend-test.io`,
        password: 'Password123!'
      });
    userA = resA.body.user;
    cookieA = resA.headers['set-cookie'] ? resA.headers['set-cookie'][0].split(';')[0] : '';

    // Register User B (Followed engineer)
    const resB = await request(app)
      .post('/api/auth/register')
      .send({
        name: 'Charles Babbage',
        username: `charles_${ts}`,
        email: `charles_${ts}@resend-test.io`,
        password: 'Password123!'
      });
    userB = resB.body.user;
    cookieB = resB.headers['set-cookie'] ? resB.headers['set-cookie'][0].split(';')[0] : '';

    // Register User C (Opted-out user)
    const resC = await request(app)
      .post('/api/auth/register')
      .send({
        name: 'Grace Hopper',
        username: `grace_${ts}`,
        email: `grace_${ts}@resend-test.io`,
        password: 'Password123!'
      });
    userC = resC.body.user;

    // User A follows User B
    await Follow.create({ follower: userA._id, following: userB._id });

    // User B creates a post
    await Post.create({
      user: userB._id,
      content: 'Zero-allocation binary packing in Go using Resend event streams #performance'
    });

    // User B creates a public project and build log
    const publicProj = await Project.create({
      owner: userB._id,
      name: 'Analytical Engine',
      slug: 'analytical-engine',
      shortDescription: 'Mechanical computing core',
      visibility: 'public'
    });

    await BuildLog.create({
      project: publicProj._id,
      author: userB._id,
      title: 'Gear train torque calibration',
      content: 'Calibrated brass gear tolerances to 0.01mm.',
      entryType: 'milestone'
    });

    // User B creates a private project and private log (MUST NEVER LEAK)
    const privateProj = await Project.create({
      owner: userB._id,
      name: 'Top Secret Quantum Gear',
      slug: 'top-secret-quantum-gear',
      shortDescription: 'Classified mechanical cipher',
      visibility: 'private'
    });

    await BuildLog.create({
      project: privateProj._id,
      author: userB._id,
      title: 'Classified Rotor Cryptanalysis',
      content: 'High security cipher definitions.',
      entryType: 'research'
    });
  });

  afterAll(async () => {
    await Digest.deleteMany({ periodKey: currentBounds.periodKey });
    await DigestPreference.deleteMany({ user: { $in: [userA._id, userB._id, userC._id] } });
    await User.deleteMany({ email: /@resend-test\.io$/ });
    await Project.deleteMany({ owner: userB._id });
    await BuildLog.deleteMany({ author: userB._id });
    await Post.deleteMany({ user: userB._id });
    await Follow.deleteMany({ follower: userA._id });
  });

  // ========================================================
  // 1. Resend SDK Dispatch & Mocking
  // ========================================================
  describe('1. Resend SDK Dispatch & Error Responses', () => {
    it('successfully accepts email request via mocked Resend SDK', async () => {
      const calls = [];
      const mockResend = {
        emails: {
          send: async (payload) => {
            calls.push(payload);
            return {
              data: { id: 'resend_msg_abc123' },
              error: null
            };
          }
        }
      };

      const digest = await Digest.create({
        user: userA._id,
        periodKey: currentBounds.periodKey,
        startDate: currentBounds.startDate,
        endDate: currentBounds.endDate,
        summary: 'Your weekly summary',
        deliveryStatus: 'in_app_only',
        sections: { followedPosts: [], followedBuildLogs: [], publicHighlights: [] }
      });

      const res = await sendDigestEmail({
        user: userA,
        digest,
        dateRangeLabel: currentBounds.label,
        mockResend
      });

      expect(res.success).toBe(true);
      expect(res.status).toBe('email_sent');
      expect(res.messageId).toBe('resend_msg_abc123');
      expect(calls).toHaveLength(1);
      expect(calls[0].to).toEqual([userA.email]);
      expect(calls[0].subject).toContain('Postify Weekly Digest');
      expect(calls[0].headers['X-Entity-Ref-ID']).toBeDefined();
      expect(calls[0].text).toBeDefined();

      await Digest.findByIdAndDelete(digest._id);
    });

    it('handles Resend returning an API error without crashing', async () => {
      const mockResend = {
        emails: {
          send: async () => ({
            data: null,
            error: {
              name: 'validation_error',
              message: 'Invalid sender domain or unverified address.',
              statusCode: 422
            }
          })
        }
      };

      const digest = await Digest.create({
        user: userA._id,
        periodKey: currentBounds.periodKey,
        startDate: currentBounds.startDate,
        endDate: currentBounds.endDate,
        deliveryStatus: 'in_app_only',
        sections: {}
      });

      const res = await sendDigestEmail({
        user: userA,
        digest,
        dateRangeLabel: currentBounds.label,
        mockResend
      });

      expect(res.success).toBe(false);
      expect(res.status).toBe('email_failed');
      expect(res.error).toContain('Invalid sender domain');
      expect(res.isAmbiguousTimeout).toBe(false);

      await Digest.findByIdAndDelete(digest._id);
    });

    it('handles unexpected network / SDK exception gracefully', async () => {
      const mockResend = {
        emails: {
          send: async () => {
            throw new Error('Connection reset by peer (ECONNRESET)');
          }
        }
      };

      const digest = await Digest.create({
        user: userA._id,
        periodKey: currentBounds.periodKey,
        startDate: currentBounds.startDate,
        endDate: currentBounds.endDate,
        deliveryStatus: 'in_app_only',
        sections: {}
      });

      const res = await sendDigestEmail({
        user: userA,
        digest,
        dateRangeLabel: currentBounds.label,
        mockResend
      });

      expect(res.success).toBe(false);
      expect(res.status).toBe('email_failed');
      expect(res.error).toContain('Connection reset');

      await Digest.findByIdAndDelete(digest._id);
    });
  });

  // ========================================================
  // 2. Configuration Validation
  // ========================================================
  describe('2. Environment Configuration Validation', () => {
    it('detects missing RESEND_API_KEY and returns unconfigured', () => {
      const env = { RESEND_FROM_EMAIL: 'onboarding@resend.dev' };
      expect(isEmailConfigured(env)).toBe(false);

      const config = getEmailConfig(env);
      expect(config.configured).toBe(false);
      expect(config.missing).toContain('RESEND_API_KEY');
    });

    it('detects missing RESEND_FROM_EMAIL and returns unconfigured', () => {
      const env = { RESEND_API_KEY: 're_test_key_123' };
      expect(isEmailConfigured(env)).toBe(false);

      const config = getEmailConfig(env);
      expect(config.configured).toBe(false);
      expect(config.missing).toContain('RESEND_FROM_EMAIL');
    });

    it('reports disabled deliveryStatus when sendDigestEmail is called with missing configuration', async () => {
      const origKey = process.env.RESEND_API_KEY;
      const origFrom = process.env.RESEND_FROM_EMAIL;
      delete process.env.RESEND_API_KEY;
      delete process.env.RESEND_FROM_EMAIL;

      try {
        const digest = { _id: new mongoose.Types.ObjectId(), periodKey: currentBounds.periodKey };
        const res = await sendDigestEmail({
          user: userA,
          digest,
          dateRangeLabel: currentBounds.label
        });

        expect(res.success).toBe(false);
        expect(res.status).toBe('disabled');
        expect(res.configured).toBe(false);
        expect(res.message).toMatch(/not configured/i);
      } finally {
        if (origKey) process.env.RESEND_API_KEY = origKey;
        if (origFrom) process.env.RESEND_FROM_EMAIL = origFrom;
      }
    });
  });

  // ========================================================
  // 3. User Preferences, Opt-In & Opt-Out
  // ========================================================
  describe('3. User Preferences and Opt-In Enforcement', () => {
    it('does NOT attempt email delivery when user has emailDelivery: false', async () => {
      // Set user preference to emailDelivery: false
      await DigestPreference.findOneAndUpdate(
        { user: userC._id },
        { enabled: true, emailDelivery: false },
        { upsert: true }
      );

      let sendCalled = false;
      const mockResend = {
        emails: {
          send: async () => {
            sendCalled = true;
            return { data: { id: 'should-not-be-called' } };
          }
        }
      };

      const digest = await generateDigestForUser(userC._id, currentBounds.periodKey, {
        mockResend,
        force: true
      });

      expect(digest).toBeDefined();
      expect(digest.deliveryStatus).toBe('in_app_only');
      expect(sendCalled).toBe(false);

      await Digest.findByIdAndDelete(digest._id);
    });

    it('skips digest generation entirely when user has enabled: false', async () => {
      await DigestPreference.findOneAndUpdate(
        { user: userC._id },
        { enabled: false, emailDelivery: true },
        { upsert: true }
      );

      const digest = await generateDigestForUser(userC._id, currentBounds.periodKey);
      expect(digest).toBeNull();
    });

    it('respects real-time email preference toggle from frontend', async () => {
      // User A opts in
      await request(app)
        .put('/api/digest/preferences')
        .set('Cookie', cookieA)
        .send({ emailDelivery: true });

      let pref = await DigestPreference.findOne({ user: userA._id });
      expect(pref.emailDelivery).toBe(true);

      // User A opts out
      await request(app)
        .put('/api/digest/preferences')
        .set('Cookie', cookieA)
        .send({ emailDelivery: false });

      pref = await DigestPreference.findOne({ user: userA._id });
      expect(pref.emailDelivery).toBe(false);
    });
  });

  // ========================================================
  // 4. Idempotency, Concurrency & Bounded Retries
  // ========================================================
  describe('4. Idempotency, Concurrency & Bounded Retries', () => {
    it('prevents duplicate emails when digest was already marked email_sent', async () => {
      let sendCount = 0;
      const mockResend = {
        emails: {
          send: async () => {
            sendCount++;
            return { data: { id: `msg_${sendCount}` }, error: null };
          }
        }
      };

      await DigestPreference.findOneAndUpdate(
        { user: userA._id },
        { enabled: true, emailDelivery: true },
        { upsert: true }
      );

      // First run: dispatches email
      const digest1 = await generateDigestForUser(userA._id, currentBounds.periodKey, {
        mockResend,
        force: true
      });
      expect(digest1.deliveryStatus).toBe('email_sent');
      expect(sendCount).toBe(1);

      // Second run: same period without forceEmail must skip send
      const digest2 = await generateDigestForUser(userA._id, currentBounds.periodKey, {
        mockResend,
        force: true
      });
      expect(digest2.deliveryStatus).toBe('email_sent');
      expect(sendCount).toBe(1); // Still exactly 1! No duplicate email!

      await Digest.findByIdAndDelete(digest1._id);
    });

    it('detects ambiguous network timeout and blocks blind duplicate resending', async () => {
      let sendCount = 0;
      const mockResend = {
        emails: {
          send: async () => {
            sendCount++;
            const err = new Error('Gateway request timed out');
            err.code = 'ETIMEDOUT';
            throw err;
          }
        }
      };

      const digest = await Digest.create({
        user: userA._id,
        periodKey: currentBounds.periodKey,
        startDate: currentBounds.startDate,
        endDate: currentBounds.endDate,
        deliveryStatus: 'in_app_only',
        sections: {}
      });

      // Attempt 1: encounters timeout
      const res1 = await sendDigestEmail({
        user: userA,
        digest,
        dateRangeLabel: currentBounds.label,
        mockResend
      });

      expect(res1.status).toBe('email_failed');
      expect(res1.isAmbiguousTimeout).toBe(true);

      digest.isAmbiguousTimeout = true;
      digest.deliveryStatus = 'email_failed';
      await digest.save();

      // Attempt 2 without force: must be blocked to prevent accidental duplicate dispatch
      const res2 = await sendDigestEmail({
        user: userA,
        digest,
        dateRangeLabel: currentBounds.label,
        mockResend,
        force: false
      });

      expect(res2.status).toBe('ambiguous_timeout_blocked');
      expect(sendCount).toBe(1); // Provider was not contacted a second time blindly

      await Digest.findByIdAndDelete(digest._id);
    });

    it('enforces bounded retries: rejects after 3 failed attempts', async () => {
      const digest = await Digest.create({
        user: userA._id,
        periodKey: currentBounds.periodKey,
        startDate: currentBounds.startDate,
        endDate: currentBounds.endDate,
        deliveryStatus: 'email_failed',
        deliveryAttempts: 3,
        sections: {}
      });

      const mockResend = {
        emails: {
          send: async () => ({ data: { id: 'should-not-send' } })
        }
      };

      const res = await sendDigestEmail({
        user: userA,
        digest,
        dateRangeLabel: currentBounds.label,
        mockResend,
        force: false
      });

      expect(res.status).toBe('max_retries_exceeded');
      expect(res.attempts).toBe(3);

      await Digest.findByIdAndDelete(digest._id);
    });

    it('passes idempotencyKey in requestOptions according to Resend SDK contract', async () => {
      let capturedPayload = null;
      let capturedOptions = null;

      const mockResend = {
        emails: {
          send: async (payload, options) => {
            capturedPayload = payload;
            capturedOptions = options;
            return { data: { id: 'idemp_test_id' }, error: null };
          }
        }
      };

      const digest = {
        _id: new mongoose.Types.ObjectId(),
        periodKey: currentBounds.periodKey,
        deliveryKey: `digest_${Date.now()}`
      };

      const res = await sendDigestEmail({
        user: userA,
        digest,
        dateRangeLabel: currentBounds.label,
        mockResend
      });

      expect(res.success).toBe(true);
      expect(capturedOptions).toBeDefined();
      expect(capturedOptions.idempotencyKey).toBe(digest.deliveryKey);
      expect(capturedPayload.headers['X-Entity-Ref-ID']).toBe(digest.deliveryKey);
    });

    it('prevents concurrent workers from claiming and dispatching the same digest', async () => {
      await Digest.deleteMany({ user: userA._id, periodKey: currentBounds.periodKey });

      let resendDispatchCount = 0;
      const mockResend = {
        emails: {
          send: async () => {
            resendDispatchCount++;
            // Simulate network latency so second worker overlaps
            await new Promise((r) => setTimeout(r, 60));
            return { data: { id: `concurrent_msg_${resendDispatchCount}` }, error: null };
          }
        }
      };

      await DigestPreference.findOneAndUpdate(
        { user: userA._id },
        { enabled: true, emailDelivery: true },
        { upsert: true }
      );

      // Two concurrent workers executing generateDigestForUser simultaneously
      const [worker1, worker2] = await Promise.all([
        generateDigestForUser(userA._id, currentBounds.periodKey, { mockResend, force: true }),
        generateDigestForUser(userA._id, currentBounds.periodKey, { mockResend, force: true })
      ]);

      expect(worker1).toBeDefined();
      expect(worker2).toBeDefined();
      // Exactly ONE worker must have dispatched to Resend
      expect(resendDispatchCount).toBe(1);

      await Digest.deleteMany({ user: userA._id, periodKey: currentBounds.periodKey });
    });

    it('recovers from process crash if worker died while in sending status after stale threshold', async () => {
      await Digest.deleteMany({ user: userA._id, periodKey: currentBounds.periodKey });

      // Create a stale digest document simulating a dead/crashed worker from 10 minutes ago
      const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);
      await Digest.create({
        user: userA._id,
        periodKey: currentBounds.periodKey,
        startDate: currentBounds.startDate,
        endDate: currentBounds.endDate,
        deliveryStatus: 'sending',
        lastDeliveryAttemptAt: tenMinutesAgo,
        deliveryAttempts: 1,
        sections: {}
      });

      let recoveredSendCount = 0;
      const mockResend = {
        emails: {
          send: async () => {
            recoveredSendCount++;
            return { data: { id: 'recovered_after_crash_123' }, error: null };
          }
        }
      };

      await DigestPreference.findOneAndUpdate(
        { user: userA._id },
        { enabled: true, emailDelivery: true },
        { upsert: true }
      );

      // Subsequent job run recovers the stale claim and successfully dispatches
      const recoveredDoc = await generateDigestForUser(userA._id, currentBounds.periodKey, {
        mockResend,
        force: true
      });

      expect(recoveredSendCount).toBe(1);
      expect(recoveredDoc.deliveryStatus).toBe('email_sent');
      expect(recoveredDoc.emailMessageId).toBe('recovered_after_crash_123');

      await Digest.deleteMany({ user: userA._id, periodKey: currentBounds.periodKey });
    });
  });

  // ========================================================
  // 5. HTML Escaping, Malicious Content & Unsafe URLs
  // ========================================================
  describe('5. Content Security, URL Sanitization & Privacy Isolation', () => {
    it('escapes malicious HTML & script tags in user names, excerpts, and titles', () => {
      const xssUser = {
        name: '<script>alert("XSS")</script>Dr. Evil',
        username: 'evil_dev',
        email: 'evil@resend-test.io'
      };

      const digestWithXss = {
        summary: '<img src=x onerror=alert(1)>Malicious summary',
        sections: {
          followedPosts: [
            {
              _id: new mongoose.Types.ObjectId(),
              author: { name: '<b onmouseover=alert(1)>Hacker</b>' },
              content: '<iframe src="evil.com"></iframe>Payload'
            }
          ],
          followedBuildLogs: [
            {
              _id: new mongoose.Types.ObjectId(),
              title: '<svg onload=alert(1)>Exploit</svg>',
              entryType: 'milestone',
              project: { name: '<b>Test</b>', slug: 'test' }
            }
          ]
        }
      };

      const html = buildDigestEmailHtml({
        user: xssUser,
        digest: digestWithXss,
        dateRangeLabel: 'Oct 13 - Oct 19',
        clientBaseUrl: 'http://localhost:5173'
      });

      expect(html).not.toContain('<script>');
      expect(html).not.toContain('<iframe');
      expect(html).not.toContain('<svg onload');
      expect(html).not.toContain('<img src=x');
      expect(html).toContain('&lt;script&gt;');
      expect(html).toContain('&lt;iframe');
    });

    it('rejects unsafe URL protocols (javascript:, data:, vbscript:) and falls back to safe base', () => {
      expect(sanitizeUrl('javascript:alert(1)', 'http://localhost:5173')).toBe('http://localhost:5173');
      expect(sanitizeUrl('data:text/html,<script>alert(1)</script>', 'http://localhost:5173')).toBe('http://localhost:5173');
      expect(sanitizeUrl('vbscript:msgbox(1)', 'http://localhost:5173')).toBe('http://localhost:5173');
      expect(sanitizeUrl('https://postify.io/digest', 'http://localhost:5173')).toBe('https://postify.io/digest');
      expect(sanitizeUrl('/digest', 'http://localhost:5173')).toBe('http://localhost:5173/digest');
    });

    it('generates a clean plain-text companion email', () => {
      const digest = {
        summary: 'Your weekly summary of developer updates.',
        sections: {
          followedPosts: [
            {
              _id: new mongoose.Types.ObjectId(),
              author: { name: 'Ada' },
              content: 'Writing code for the analytical engine.'
            }
          ]
        }
      };

      const text = buildDigestEmailText({
        user: userA,
        digest,
        dateRangeLabel: 'Oct 13 – Oct 19, 2026',
        clientBaseUrl: 'http://localhost:5173'
      });

      expect(text).toContain('POSTIFY — WEEKLY DEVELOPER DIGEST');
      expect(text).toContain('Ada: "Writing code for the analytical engine."');
      expect(text).toContain('View your full in-app digest:');
      expect(text).toContain('Unsubscribe:');
    });

    it('never leaks private projects or private build logs into digest email content', async () => {
      await DigestPreference.findOneAndUpdate(
        { user: userA._id },
        { enabled: true, emailDelivery: true },
        { upsert: true }
      );

      const mockResend = {
        emails: {
          send: async () => ({ data: { id: 'leak_check_msg' }, error: null })
        }
      };

      const digest = await generateDigestForUser(userA._id, currentBounds.periodKey, {
        mockResend,
        force: true
      });
      expect(digest).toBeDefined();

      const html = buildDigestEmailHtml({
        user: userA,
        digest,
        dateRangeLabel: currentBounds.label,
        clientBaseUrl: 'http://localhost:5173'
      });

      const text = buildDigestEmailText({
        user: userA,
        digest,
        dateRangeLabel: currentBounds.label,
        clientBaseUrl: 'http://localhost:5173'
      });

      // Must contain public project
      expect(html).toContain('Analytical Engine');
      expect(text).toContain('Analytical Engine');

      // MUST NOT leak private project or private log
      expect(html).not.toContain('Top Secret Quantum Gear');
      expect(html).not.toContain('Classified Rotor Cryptanalysis');
      expect(text).not.toContain('Top Secret Quantum Gear');
      expect(text).not.toContain('Classified Rotor Cryptanalysis');

      await Digest.findByIdAndDelete(digest._id);
    });
  });

  // ========================================================
  // 6. Batch Processing & Isolated Recipient Failure
  // ========================================================
  describe('6. Batch Scheduled Job Runner & Error Isolation', () => {
    it('continues processing remaining recipients when one recipient fails', async () => {
      let callCount = 0;
      const mockResend = {
        emails: {
          send: async (payload) => {
            callCount++;
            // Fail specifically for User A, succeed for others
            if (payload.to && payload.to.includes(userA.email)) {
              return {
                data: null,
                error: { message: 'Mailbox full for User A', name: 'delivery_error' }
              };
            }
            return { data: { id: `msg_success_${callCount}` }, error: null };
          }
        }
      };

      // User A and User B opt-in
      await DigestPreference.findOneAndUpdate(
        { user: userA._id },
        { enabled: true, emailDelivery: true },
        { upsert: true }
      );
      await DigestPreference.findOneAndUpdate(
        { user: userB._id },
        { enabled: true, emailDelivery: true },
        { upsert: true }
      );

      const batchResults = await generateAllActiveDigests(currentBounds.periodKey, {
        mockResend,
        force: true
      });

      expect(batchResults.total).toBeGreaterThanOrEqual(2);
      expect(batchResults.emailsFailed).toBeGreaterThanOrEqual(1); // User A failed
      expect(batchResults.emailsSent).toBeGreaterThanOrEqual(1); // User B succeeded
    });

    it('in-app digest remains 100% accessible via API when Resend is unconfigured', async () => {
      const origKey = process.env.RESEND_API_KEY;
      delete process.env.RESEND_API_KEY;

      await Digest.deleteMany({ user: userA._id, periodKey: currentBounds.periodKey });

      try {
        const res = await request(app)
          .get('/api/digest/current')
          .set('Cookie', cookieA);

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.digest).toBeDefined();
        expect(['in_app_only', 'disabled']).toContain(res.body.digest.deliveryStatus);
        expect(res.body.digest.periodKey).toBe(currentBounds.periodKey);
      } finally {
        if (origKey) process.env.RESEND_API_KEY = origKey;
      }
    });
  });
});
