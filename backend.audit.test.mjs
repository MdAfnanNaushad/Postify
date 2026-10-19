import 'dotenv/config';
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import mongoose from 'mongoose';
import app from './server/src/app';
import User from './server/src/models/user';
import Post from './server/src/models/post';
import Reply from './server/src/models/reply';
import Notification from './server/src/models/notification';
import { extractTags } from './server/src/utils/tagExtractor';

describe('Part A — Phases 5, 6 & 7 Audit & Regression Verification', () => {
  let userA, userB;
  let cookieA, cookieB;
  let postA;

  beforeAll(async () => {
    const mongoUri = process.env.TEST_MONGODB_URI || 'mongodb://127.0.0.1:27017/miniproject_test';
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(mongoUri);
    }

    const ts = Date.now();
    const regA = await request(app)
      .post('/api/auth/register')
      .send({
        name: 'Audit User A',
        username: `audita_${ts}`,
        email: `audita_${ts}@test.com`,
        password: 'Password123!',
        age: 26
      });
    userA = regA.body.user;
    cookieA = regA.headers['set-cookie'][0].split(';')[0];

    const regB = await request(app)
      .post('/api/auth/register')
      .send({
        name: 'Audit User B',
        username: `auditb_${ts}`,
        email: `auditb_${ts}@test.com`,
        password: 'Password123!',
        age: 28
      });
    userB = regB.body.user;
    cookieB = regB.headers['set-cookie'][0].split(';')[0];

    const pRes = await request(app)
      .post('/api/posts')
      .set('Cookie', cookieA)
      .send({ content: 'Post for audit testing with #AuditTag and code ```\n#insideCode\n```' });
    postA = pRes.body.post;
  });

  afterAll(async () => {
    if (userA && userB) {
      const uIds = [userA._id, userB._id];
      await Notification.deleteMany({ $or: [{ recipient: { $in: uIds } }, { actor: { $in: uIds } }] });
      await Reply.deleteMany({ user: { $in: uIds } });
      await Post.deleteMany({ user: { $in: uIds } });
      await User.deleteMany({ _id: { $in: uIds } });
    }
  });

  it('1. Tag Extractor ignores Markdown headings (# Heading, ### Subheading) and fenced code blocks', () => {
    const markdown = `# Main Title
Here is some text with #RealTag and a ### Section Header
\`\`\`javascript
// Comment #CodeTag
const x = "#anotherCodeTag";
\`\`\`
And inline \`#inlineCodeTag\` followed by #ValidTag2.`;

    const tags = extractTags(markdown);
    expect(tags).toContain('realtag');
    expect(tags).toContain('validtag2');
    expect(tags).not.toContain('main');
    expect(tags).not.toContain('section');
    expect(tags).not.toContain('codetag');
    expect(tags).not.toContain('anothercodetag');
    expect(tags).not.toContain('inlinecodetag');
  });

  it('2. Notification Deduplication: Retrying like does not duplicate notification', async () => {
    // User B likes User A's post
    const like1 = await request(app)
      .put(`/api/posts/${postA._id}/like`)
      .set('Cookie', cookieB);
    expect(like1.status).toBe(200);

    const count1 = await Notification.countDocuments({
      recipient: userA._id,
      actor: userB._id,
      type: 'like',
      post: postA._id
    });
    expect(count1).toBe(1);

    // User B retries like
    const like2 = await request(app)
      .put(`/api/posts/${postA._id}/like`)
      .set('Cookie', cookieB);
    expect(like2.status).toBe(200);

    const count2 = await Notification.countDocuments({
      recipient: userA._id,
      actor: userB._id,
      type: 'like',
      post: postA._id
    });
    expect(count2).toBe(1); // Still exactly 1
  });

  it('3. Genuine New Interaction: Unliking cleans up like notification, allowing re-liking to notify again', async () => {
    // User B unlikes post
    const unlikeRes = await request(app)
      .delete(`/api/posts/${postA._id}/like`)
      .set('Cookie', cookieB);
    expect(unlikeRes.status).toBe(200);

    const countAfterUnlike = await Notification.countDocuments({
      recipient: userA._id,
      actor: userB._id,
      type: 'like',
      post: postA._id
    });
    expect(countAfterUnlike).toBe(0);

    // User B legitimately likes post again
    const relikeRes = await request(app)
      .put(`/api/posts/${postA._id}/like`)
      .set('Cookie', cookieB);
    expect(relikeRes.status).toBe(200);

    const countAfterRelike = await Notification.countDocuments({
      recipient: userA._id,
      actor: userB._id,
      type: 'like',
      post: postA._id
    });
    expect(countAfterRelike).toBe(1);
  });

  it('4. Distinct interactions: Two distinct replies by User B create two distinct notifications', async () => {
    const r1 = await request(app)
      .post(`/api/posts/${postA._id}/replies`)
      .set('Cookie', cookieB)
      .send({ content: 'First distinct reply from User B' });
    expect(r1.status).toBe(201);

    const r2 = await request(app)
      .post(`/api/posts/${postA._id}/replies`)
      .set('Cookie', cookieB)
      .send({ content: 'Second distinct reply from User B' });
    expect(r2.status).toBe(201);

    const replyNotifs = await Notification.find({
      recipient: userA._id,
      actor: userB._id,
      type: 'reply',
      post: postA._id
    });
    expect(replyNotifs.length).toBe(2);
    expect(replyNotifs[0].sourceKey).not.toBe(replyNotifs[1].sourceKey);
  });

  it('5. Profile Security: Rejects non-HTTP URLs in selectedProjects to prevent script injection', async () => {
    const badUpdate = await request(app)
      .put('/api/users/me')
      .set('Cookie', cookieA)
      .send({
        selectedProjects: [
          {
            name: 'Malicious Project',
            projectUrl: 'javascript:alert(1)'
          }
        ]
      });

    expect(badUpdate.status).toBe(400);
    expect(badUpdate.body.message).toContain('http:// or https://');
  });

  it('6. Search Injection Resistance: Special regex metacharacters do not crash server or cause ReDoS', async () => {
    const maliciousQueries = ['[a-z]+', '.*', '(?=abc)', '((((((a+)+)+)+)+)+)$', '\\', '***'];

    for (const q of maliciousQueries) {
      const res = await request(app).get(`/api/search?q=${encodeURIComponent(q)}`);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    }
  });

  it('7. Search Input Limits: Enforces 100 character maximum limit', async () => {
    const longQuery = 'a'.repeat(101);
    const res = await request(app).get(`/api/search?q=${longQuery}`);
    expect(res.status).toBe(400);
    expect(res.body.message).toContain('maximum 100 characters');
  });
});
