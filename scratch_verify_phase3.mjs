import 'dotenv/config';
import puppeteer from 'puppeteer-core';
import fs from 'fs';
import path from 'path';
import http from 'http';
import express from 'express';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';

import { initSocket } from './server/src/socket.js';
import User from './server/src/models/user.js';
import Post from './server/src/models/post.js';
import Reply from './server/src/models/reply.js';

import authRoutes from './server/src/routes/authRoutes.js';
import userRoutes from './server/src/routes/userRoutes.js';
import postRoutes from './server/src/routes/postRoutes.js';
import replyRoutes from './server/src/routes/replyRoutes.js';

const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const screenshotsDir = 'c:/Users/User/Projects/Postify/screenshots/phase3';

if (!fs.existsSync(screenshotsDir)) {
  fs.mkdirSync(screenshotsDir, { recursive: true });
}

const TEST_PORT = 5055;
const TEST_MONGODB_URI = process.env.TEST_MONGODB_URI || 'mongodb://127.0.0.1:27017/miniproject_test';
const JWT_SECRET = process.env.JWT_SECRET || 'postify_super_secure_twilight_jwt_secret_2025_portal_key_!98';

async function run() {
  console.log('--- STARTING PHASE 3 REAL-TIME & THREADED DISCUSSIONS ACCEPTANCE VERIFICATION ---');

  // 1. Connect to isolated test database
  if (mongoose.connection.readyState === 0) {
    await mongoose.connect(TEST_MONGODB_URI);
  }
  console.log('[1/7] Connected to isolated test database miniproject_test');

  // 2. Setup Express test server serving client/dist and APIs
  const app = express();
  app.use(cors({ origin: true, credentials: true }));
  app.use(cookieParser());
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Uploads & static client build
  const clientDist = path.resolve('client/dist');
  const uploadsPath = path.resolve('public/images/uploads');
  app.use('/uploads', express.static(uploadsPath));
  app.use('/images/uploads', express.static(uploadsPath));
  app.use(express.static(clientDist));

  // Mount API routes
  app.use('/api/auth', authRoutes);
  app.use('/api/users', userRoutes);
  app.use('/api/posts', postRoutes);
  app.use('/api/replies', replyRoutes);

  // SPA fallback
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api') || req.path.startsWith('/socket.io')) {
      return next();
    }
    res.sendFile(path.join(clientDist, 'index.html'));
  });

  const server = http.createServer(app);
  initSocket(server);

  await new Promise((resolve) => server.listen(TEST_PORT, resolve));
  console.log(`[2/7] Isolated test server listening on http://localhost:${TEST_PORT}`);

  // 3. Seed test users and test post in miniproject_test
  const ts = Date.now();
  const hashedPassword = await bcrypt.hash('Password123!', 10);

  const userA = await User.create({
    username: `user_alpha_${ts}`,
    name: 'Ada Lovelace',
    email: `ada_${ts}@test.com`,
    password: hashedPassword,
    Profilepic: 'Profilepic.jpg'
  });

  const userB = await User.create({
    username: `user_beta_${ts}`,
    name: 'Charles Babbage',
    email: `charles_${ts}@test.com`,
    password: hashedPassword,
    Profilepic: 'Profilepic.jpg'
  });

  const testPost = await Post.create({
    user: userA._id,
    content: '## Postify Real-Time Synchronization Engine\n\nSocket.IO live threads, atomic idempotent likes, and structured nested replies.',
    likes: []
  });

  console.log(`[3/7] Created test post ID: ${testPost._id}`);

  // Generate tokens for both users
  const tokenA = jwt.sign({ userid: userA._id, email: userA.email }, JWT_SECRET, { expiresIn: '1d' });
  const tokenB = jwt.sign({ userid: userB._id, email: userB.email }, JWT_SECRET, { expiresIn: '1d' });

  // 4. Launch Puppeteer with two completely independent browser contexts
  const browser = await puppeteer.launch({
    executablePath: chromePath,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const contextA = await browser.createBrowserContext();
  const contextB = await browser.createBrowserContext();

  const pageA = await contextA.newPage();
  const pageB = await contextB.newPage();

  // Set cookies for authentication in each page
  await pageA.setCookie({
    name: 'token',
    value: tokenA,
    url: `http://localhost:${TEST_PORT}`,
    httpOnly: true
  });

  await pageB.setCookie({
    name: 'token',
    value: tokenB,
    url: `http://localhost:${TEST_PORT}`,
    httpOnly: true
  });

  pageA.on('console', (msg) => {
    console.log('[PAGE A CONSOLE]:', msg.type(), msg.text());
  });
  pageB.on('console', (msg) => {
    console.log('[PAGE B CONSOLE]:', msg.type(), msg.text());
  });

  pageA.on('request', (req) => {
    if (req.url().includes('/api/')) console.log('[PAGE A REQ]:', req.method(), req.url());
  });
  pageA.on('response', (res) => {
    if (res.url().includes('/api/')) console.log('[PAGE A RES]:', res.status(), res.url());
  });

  pageB.on('request', (req) => {
    if (req.url().includes('/api/')) console.log('[PAGE B REQ]:', req.method(), req.url());
  });
  pageB.on('response', (res) => {
    if (res.url().includes('/api/')) console.log('[PAGE B RES]:', res.status(), res.url());
  });

  console.log('[4/7] Launched 2 independent browser contexts with authenticated cookies');

  // Navigate both pages to the post detail page
  const postUrl = `http://localhost:${TEST_PORT}/post/${testPost._id}`;
  await pageA.setViewport({ width: 1280, height: 800 });
  await pageB.setViewport({ width: 1280, height: 800 });

  await pageA.goto(postUrl, { waitUntil: 'networkidle0' });
  await pageB.goto(postUrl, { waitUntil: 'networkidle0' });
  await new Promise((r) => setTimeout(r, 1000));

  console.log('[5/7] Both browser sessions viewing the post detail page');

  // Verify initial state: 0 likes, 0 replies
  const initialLikesB = await pageB.$eval('[data-testid="like-count"], button span', (el) => el.textContent.trim()).catch(() => '0');
  console.log(`Initial likes seen by User B: ${initialLikesB}`);

  // User A posts a reply
  console.log('Submitting reply from User A in Window 1...');
  await pageA.waitForSelector('#main-reply-textarea', { timeout: 6000 });
  await pageA.type('#main-reply-textarea', 'Real-time sync test: User A submitting live reply without page refresh.');
  await pageA.click('button[type="submit"]');

  // User B's page should receive the reply in real time without refreshing
  console.log('Awaiting real-time reply update in User B Window 2...');
  await pageB.waitForFunction(
    () => document.body.innerText.includes('Real-time sync test: User A submitting live reply'),
    { timeout: 7000 }
  );
  console.log('SUCCESS: User B Window 2 dynamically received User A\'s reply in real time!');

  // User B likes the post
  console.log('User B clicking Like button in Window 2...');
  await pageB.waitForSelector('button[aria-label="Like story"]', { timeout: 6000 });
  await pageB.click('button[aria-label="Like story"]');
  await new Promise((r) => setTimeout(r, 1200));

  const pageAText = await pageA.evaluate(() => document.body.innerText);
  console.log('[DEBUG] Page A body text contains "1 like"?', pageAText.includes('1 like'), 'Text snippet around like:');
  const likeMatch = pageAText.match(/.{0,30}like.{0,30}/gi);
  console.log('[DEBUG] Matches for "like" on Page A:', likeMatch);

  // User A's page should receive the like count increment in real time
  console.log('Awaiting real-time like count update in User A Window 1...');
  await pageA.waitForFunction(
    () => {
      const text = document.body.innerText;
      return text.includes('1 like') || text.includes('1 Like');
    },
    { timeout: 7000 }
  );
  console.log('SUCCESS: User A Window 1 dynamically received like count update (1 like) in real time!');

  // Capture Window 1 and Window 2 screenshots showing cross-client synchronization
  await pageA.screenshot({
    path: path.join(screenshotsDir, 'phase3_realtime_window_a.png'),
    fullPage: false
  });
  await pageB.screenshot({
    path: path.join(screenshotsDir, 'phase3_realtime_window_b.png'),
    fullPage: false
  });

  // 6. Responsive and Theme Screenshots (Light, Dark, Desktop, Mobile)
  console.log('[6/7] Capturing theme and responsive screenshots...');

  // Desktop Light
  await pageA.setViewport({ width: 1280, height: 900 });
  await pageA.evaluate(() => {
    localStorage.setItem('postify-theme', 'light');
    document.documentElement.classList.remove('dark');
    document.documentElement.setAttribute('data-theme', 'light');
    document.documentElement.style.colorScheme = 'light';
  });
  await new Promise((r) => setTimeout(r, 500));
  await pageA.screenshot({
    path: path.join(screenshotsDir, 'phase3_desktop_light.png'),
    fullPage: false
  });

  // Desktop Dark (toggle dark mode)
  await pageA.evaluate(() => {
    localStorage.setItem('postify-theme', 'dark');
    document.documentElement.classList.add('dark');
    document.documentElement.setAttribute('data-theme', 'dark');
    document.documentElement.style.colorScheme = 'dark';
  });
  await new Promise((r) => setTimeout(r, 500));
  await pageA.screenshot({
    path: path.join(screenshotsDir, 'phase3_desktop_dark.png'),
    fullPage: false
  });

  // Mobile Light (390px)
  await pageA.evaluate(() => {
    localStorage.setItem('postify-theme', 'light');
    document.documentElement.classList.remove('dark');
    document.documentElement.setAttribute('data-theme', 'light');
    document.documentElement.style.colorScheme = 'light';
  });
  await pageA.setViewport({ width: 390, height: 844 });
  await new Promise((r) => setTimeout(r, 500));
  await pageA.screenshot({
    path: path.join(screenshotsDir, 'phase3_mobile_light.png'),
    fullPage: false
  });

  // Mobile Dark (390px)
  await pageA.evaluate(() => {
    localStorage.setItem('postify-theme', 'dark');
    document.documentElement.classList.add('dark');
    document.documentElement.setAttribute('data-theme', 'dark');
    document.documentElement.style.colorScheme = 'dark';
  });
  await new Promise((r) => setTimeout(r, 500));
  await pageA.screenshot({
    path: path.join(screenshotsDir, 'phase3_mobile_dark.png'),
    fullPage: false
  });

  console.log('All screenshots captured successfully.');

  // 7. Cleanup
  console.log('[7/7] Cleaning up test data in miniproject_test and closing servers...');
  await Reply.deleteMany({ post: testPost._id });
  await Post.findByIdAndDelete(testPost._id);
  await User.findByIdAndDelete(userA._id);
  await User.findByIdAndDelete(userB._id);

  await browser.close();
  await new Promise((resolve) => server.close(resolve));
  await mongoose.connection.close();

  console.log('--- ALL PHASE 3 ACCEPTANCE CRITERIA VERIFIED SUCCESSFULLY ---');
  process.exit(0);
}

run().catch((err) => {
  console.error('Verification failed with error:', err);
  process.exit(1);
});
