import 'dotenv/config';
import request from 'supertest';
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import mongoose from 'mongoose';
import http from 'http';
import { io as Client } from 'socket.io-client';
import app from './server/src/app.js';
import { initSocket } from './server/src/socket.js';
import User from './server/src/models/user.js';
import Post from './server/src/models/post.js';
import Reply from './server/src/models/reply.js';

describe('Phase 3 — Socket.IO Real-Time Engine, Atomic Likes & Threaded Replies', () => {
  let server;
  let serverPort;
  let socketUrl;

  let authorUser, adversaryUser;
  let authorCookie, adversaryCookie;
  let testPost;
  let topReply;
  let childReply;
  let grandchildReply;

  let clientSocket1, clientSocket2;

  beforeAll(async () => {
    // 1. Connect to isolated test database
    const uri = process.env.TEST_MONGODB_URI || 'mongodb://127.0.0.1:27017/miniproject_test';
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(uri);
    }

    // 2. Start dynamic HTTP server with Socket.IO for testing
    server = http.createServer(app);
    initSocket(server);
    await new Promise((resolve) => {
      server.listen(0, () => {
        serverPort = server.address().port;
        socketUrl = `http://127.0.0.1:${serverPort}`;
        resolve();
      });
    });

    // 3. Register Author and Adversary users
    const timestamp = Date.now();
    const res1 = await request(app)
      .post('/api/auth/register')
      .send({
        username: `p3_author_${timestamp}`,
        name: 'Phase3 Author',
        email: `p3_author_${timestamp}@test.com`,
        password: 'Password123!'
      });
    authorUser = res1.body.user;
    authorCookie = res1.headers['set-cookie'][0].split(';')[0];

    const res2 = await request(app)
      .post('/api/auth/register')
      .send({
        username: `p3_adversary_${timestamp}`,
        name: 'Phase3 Adversary',
        email: `p3_adversary_${timestamp}@test.com`,
        password: 'Password123!'
      });
    adversaryUser = res2.body.user;
    adversaryCookie = res2.headers['set-cookie'][0].split(';')[0];

    // 4. Create sample post
    const postRes = await request(app)
      .post('/api/posts')
      .set('Cookie', [authorCookie])
      .send({
        content: 'Real-time synchronization and threaded discussions in Postify Phase 3.'
      });
    testPost = postRes.body.post;
  });

  afterAll(async () => {
    if (clientSocket1) clientSocket1.disconnect();
    if (clientSocket2) clientSocket2.disconnect();

    if (testPost?._id) {
      await Reply.deleteMany({ post: testPost._id });
      await Post.findByIdAndDelete(testPost._id);
    }
    if (authorUser?._id) await User.findByIdAndDelete(authorUser._id);
    if (adversaryUser?._id) await User.findByIdAndDelete(adversaryUser._id);

    await new Promise((resolve) => server.close(resolve));
    await mongoose.connection.close();
  });

  it('1. Socket Authentication: Valid cookie authenticates socket session', async () => {
    clientSocket1 = Client(socketUrl, {
      extraHeaders: {
        cookie: authorCookie
      },
      transports: ['websocket']
    });

    await new Promise((resolve, reject) => {
      clientSocket1.on('connect', resolve);
      clientSocket1.on('connect_error', reject);
    });

    expect(clientSocket1.connected).toBe(true);
  });

  it('2. Socket Room Security: Reject joining room for non-existent or invalid post', async () => {
    const errorPromise = new Promise((resolve) => {
      clientSocket1.on('error', resolve);
    });

    clientSocket1.emit('join:post', { postId: '000000000000000000000000' });
    const err = await errorPromise;
    expect(err.message).toMatch(/not found|invalid/i);
  });

  it('3. Socket Room Access: Successfully join valid post room and feed room', async () => {
    const joinPostPromise = new Promise((resolve) => {
      clientSocket1.on('joined:post', resolve);
    });
    clientSocket1.emit('join:post', { postId: testPost._id });
    const joinData = await joinPostPromise;
    expect(joinData.postId).toBe(testPost._id);

    const joinFeedPromise = new Promise((resolve) => {
      clientSocket1.on('joined:feed', resolve);
    });
    clientSocket1.emit('join:feed');
    await joinFeedPromise;
  });

  it('4. Concurrent & Idempotent Likes: Atomic $addToSet prevents duplicate likes under simultaneous requests', async () => {
    // Fire 5 concurrent like requests from the same adversary user
    const concurrentRequests = Array.from({ length: 5 }).map(() =>
      request(app)
        .put(`/api/posts/${testPost._id}/like`)
        .set('Cookie', [adversaryCookie])
    );

    const responses = await Promise.all(concurrentRequests);
    responses.forEach((res) => {
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    // Verify in database: exactly 1 like exists from this user
    const postInDb = await Post.findById(testPost._id);
    const userLikes = postInDb.likes.filter((id) => id.toString() === adversaryUser._id.toString());
    expect(userLikes.length).toBe(1);
    expect(postInDb.likes.length).toBe(1);
  });

  it('5. Real-Time Broadcast: Second socket client receives post:like_updated event', async () => {
    clientSocket2 = Client(socketUrl, {
      extraHeaders: {
        cookie: adversaryCookie
      },
      transports: ['websocket']
    });

    await new Promise((resolve) => clientSocket2.on('connect', resolve));
    clientSocket2.emit('join:post', { postId: testPost._id });
    await new Promise((resolve) => clientSocket2.on('joined:post', resolve));

    const likeEventPromise = new Promise((resolve) => {
      clientSocket2.on('post:like_updated', resolve);
    });

    // Unlike post via HTTP
    await request(app)
      .delete(`/api/posts/${testPost._id}/like`)
      .set('Cookie', [adversaryCookie]);

    const eventPayload = await likeEventPromise;
    expect(eventPayload.postId).toBe(testPost._id);
    expect(eventPayload.likesCount).toBe(0);
    expect(eventPayload.action).toBe('unlike');
  });

  it('6. Threaded Replies: Create top-level reply (depth 0) and receive real-time broadcast', async () => {
    const replyEventPromise = new Promise((resolve) => {
      clientSocket2.on('reply:created', resolve);
    });

    const res = await request(app)
      .post(`/api/posts/${testPost._id}/replies`)
      .set('Cookie', [adversaryCookie])
      .send({ content: 'Top-level reflection on architecture.' });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.reply.content).toBe('Top-level reflection on architecture.');
    expect(res.body.reply.depth).toBe(0);
    expect(res.body.reply.parentReply).toBeNull();
    topReply = res.body.reply;

    const eventData = await replyEventPromise;
    expect(eventData.postId).toBe(testPost._id);
    expect(eventData.reply._id).toBe(topReply._id);
  });

  it('7. Threaded Replies: Create nested reply (depth 1) referencing parent', async () => {
    const res = await request(app)
      .post(`/api/posts/${testPost._id}/replies`)
      .set('Cookie', [authorCookie])
      .send({
        content: 'Direct reply to top-level reflection.',
        parentReply: topReply._id
      });

    expect(res.status).toBe(201);
    expect(res.body.reply.depth).toBe(1);
    expect(res.body.reply.parentReply).toBe(topReply._id);
    childReply = res.body.reply;
  });

  it('8. Thread Depth Guard: Reject reply exceeding maximum allowed thread depth (depth > 2)', async () => {
    // Create depth 2 reply (grandchild)
    const depth2Res = await request(app)
      .post(`/api/posts/${testPost._id}/replies`)
      .set('Cookie', [adversaryCookie])
      .send({
        content: 'Depth 2 reply.',
        parentReply: childReply._id
      });
    expect(depth2Res.status).toBe(201);
    expect(depth2Res.body.reply.depth).toBe(2);
    grandchildReply = depth2Res.body.reply;

    // Attempt depth 3 reply (Must be rejected)
    const depth3Res = await request(app)
      .post(`/api/posts/${testPost._id}/replies`)
      .set('Cookie', [authorCookie])
      .send({
        content: 'Depth 3 reply attempt.',
        parentReply: depth2Res.body.reply._id
      });

    expect(depth3Res.status).toBe(400);
    expect(depth3Res.body.message).toMatch(/maximum discussion nesting depth exceeded/i);
  });

  it('9. Thread Integrity: Reject parent reply that belongs to a different post', async () => {
    // Create a different post
    const otherPost = await Post.create({
      user: authorUser._id,
      content: 'Completely different post.'
    });

    const res = await request(app)
      .post(`/api/posts/${otherPost._id}/replies`)
      .set('Cookie', [adversaryCookie])
      .send({
        content: 'Cross-post parent attack attempt.',
        parentReply: topReply._id // Belongs to testPost, not otherPost
      });

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/different post/i);

    await Post.findByIdAndDelete(otherPost._id);
  });

  it('10. Security & Ownership: Adversary cannot edit author\'s reply (403 Forbidden)', async () => {
    const res = await request(app)
      .patch(`/api/replies/${childReply._id}`)
      .set('Cookie', [adversaryCookie]) // Adversary attempting to edit Author's reply
      .send({ content: 'Tampered content.' });

    expect(res.status).toBe(403);
    expect(res.body.message).toMatch(/Forbidden/i);
  });

  it('11. Security & Ownership: Author can edit their own reply and broadcast update', async () => {
    const updateEventPromise = new Promise((resolve) => {
      clientSocket2.on('reply:updated', resolve);
    });

    const res = await request(app)
      .patch(`/api/replies/${childReply._id}`)
      .set('Cookie', [authorCookie])
      .send({ content: 'Clarified technical perspective on architecture.' });

    expect(res.status).toBe(200);
    expect(res.body.reply.content).toBe('Clarified technical perspective on architecture.');

    const eventData = await updateEventPromise;
    expect(eventData.reply._id).toBe(childReply._id);
    expect(eventData.reply.content).toBe('Clarified technical perspective on architecture.');
  });

  it('12. Security & Cascade Deletion: Author deletes reply and nested replies are cleaned up', async () => {
    const deleteEventPromise = new Promise((resolve) => {
      clientSocket2.on('reply:deleted', resolve);
    });

    const res = await request(app)
      .delete(`/api/replies/${topReply._id}`)
      .set('Cookie', [adversaryCookie]); // Adversary owns topReply

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    const eventData = await deleteEventPromise;
    expect(eventData.replyId).toBe(topReply._id);

    // Verify cascade deletion: child AND grandchild replies were both deleted from database
    const childInDb = await Reply.findById(childReply._id);
    expect(childInDb).toBeNull();

    const grandchildInDb = await Reply.findById(grandchildReply._id);
    expect(grandchildInDb).toBeNull();
  });
});
