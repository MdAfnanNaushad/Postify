import puppeteer from 'puppeteer-core';
import fs from 'fs';
import path from 'path';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';

const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const screenshotsDir = 'c:/Users/User/Projects/Postify/screenshots/phase11';

if (!fs.existsSync(screenshotsDir)) {
  fs.mkdirSync(screenshotsDir, { recursive: true });
}

const JWT_SECRET = 'postify_super_secure_twilight_jwt_secret_2025_portal_key_!98';

const viewports = [
  { width: 320, height: 600, name: '320px' },
  { width: 360, height: 740, name: '360px' },
  { width: 390, height: 844, name: '390px' },
  { width: 430, height: 932, name: '430px' },
  { width: 768, height: 1024, name: '768px' },
  { width: 1024, height: 768, name: '1024px' },
  { width: 1280, height: 800, name: '1280px' },
  { width: 1440, height: 900, name: '1440px' }
];

async function runAudit() {
  // Connect to mongo briefly to get Irfan's user record
  await mongoose.connect('mongodb://127.0.0.1:27017/miniproject');
  const irfanUser = await mongoose.connection.db.collection('users').findOne({ email: 'irfan@test.com' });
  const otherUser = await mongoose.connection.db.collection('users').findOne({ username: 'Sagar' });
  await mongoose.disconnect();

  const token = jwt.sign(
    { id: irfanUser._id.toString(), email: irfanUser.email },
    JWT_SECRET,
    { expiresIn: '7d' }
  );

  const browser = await puppeteer.launch({
    executablePath: chromePath,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();

  console.log('--- 1. AUDITING LANDING PAGE VIEWPORTS & OVERFLOW ---');
  for (const vp of viewports) {
    await page.setViewport({ width: vp.width, height: vp.height });
    await page.goto('http://localhost:5173/', { waitUntil: 'networkidle0' });
    await new Promise(r => setTimeout(r, 400));

    const overflow = await page.evaluate(() => {
      return document.documentElement.scrollWidth > window.innerWidth;
    });

    console.log(`LandingPage ${vp.name}: overflow = ${overflow}`);

    if (vp.name === '390px' || vp.name === '1440px') {
      await page.screenshot({
        path: path.join(screenshotsDir, `landing_${vp.name}.png`),
        fullPage: false
      });
      await page.screenshot({
        path: path.join(screenshotsDir, `landing_full_${vp.name}.png`),
        fullPage: true
      });
    }
  }

  console.log('--- 2. AUDITING & CAPTURING LOGIN PAGE (60:40 SPLIT) ---');
  for (const vp of [viewports[2], viewports[7]]) {
    await page.setViewport({ width: vp.width, height: vp.height });
    await page.goto('http://localhost:5173/login', { waitUntil: 'networkidle0' });
    await new Promise(r => setTimeout(r, 400));

    const overflow = await page.evaluate(() => {
      return document.documentElement.scrollWidth > window.innerWidth;
    });
    console.log(`LoginPage ${vp.name}: overflow = ${overflow}`);

    await page.screenshot({
      path: path.join(screenshotsDir, `login_${vp.name}.png`),
      fullPage: true
    });
  }

  // Verify verse rotation in login page
  await page.setViewport({ width: 1440, height: 900 });
  await page.goto('http://localhost:5173/login', { waitUntil: 'networkidle0' });
  const verse1 = await page.evaluate(() => {
    return document.querySelector('p.editorial-h1')?.textContent;
  });
  console.log('Verse 1 on load:', verse1?.substring(0, 50));
  console.log('Waiting 5.2s to verify 5s rotation interval...');
  await new Promise(r => setTimeout(r, 5200));
  const verse2 = await page.evaluate(() => {
    return document.querySelector('p.editorial-h1')?.textContent;
  });
  console.log('Verse 2 after 5.2s:', verse2?.substring(0, 50));
  console.log('Verse rotated successfully:', verse1 !== verse2);

  console.log('--- 3. AUDITING & CAPTURING REGISTER PAGE ---');
  for (const vp of [viewports[2], viewports[7]]) {
    await page.setViewport({ width: vp.width, height: vp.height });
    await page.goto('http://localhost:5173/register', { waitUntil: 'networkidle0' });
    await new Promise(r => setTimeout(r, 400));

    const overflow = await page.evaluate(() => {
      return document.documentElement.scrollWidth > window.innerWidth;
    });
    console.log(`RegisterPage ${vp.name}: overflow = ${overflow}`);

    await page.screenshot({
      path: path.join(screenshotsDir, `register_${vp.name}.png`),
      fullPage: true
    });
  }

  console.log('--- 4. AUDITING & CAPTURING FEED PAGE ---');
  for (const vp of [viewports[2], viewports[7]]) {
    await page.setViewport({ width: vp.width, height: vp.height });
    await page.goto('http://localhost:5173/feed', { waitUntil: 'networkidle0' });
    await new Promise(r => setTimeout(r, 500));

    const overflow = await page.evaluate(() => {
      return document.documentElement.scrollWidth > window.innerWidth;
    });
    console.log(`FeedPage ${vp.name}: overflow = ${overflow}`);

    await page.screenshot({
      path: path.join(screenshotsDir, `feed_${vp.name}.png`),
      fullPage: false
    });
  }

  console.log('--- 5. INJECTING AUTH TOKEN & AUDITING /profile ---');
  await page.setCookie({
    name: 'token',
    value: token,
    domain: 'localhost',
    path: '/',
    httpOnly: true
  });

  for (const vp of [viewports[2], viewports[7]]) {
    await page.setViewport({ width: vp.width, height: vp.height });
    await page.goto('http://localhost:5173/profile', { waitUntil: 'networkidle0' });
    await new Promise(r => setTimeout(r, 600));

    const overflow = await page.evaluate(() => {
      return document.documentElement.scrollWidth > window.innerWidth;
    });
    console.log(`ProfilePage ${vp.name}: overflow = ${overflow}`);

    await page.screenshot({
      path: path.join(screenshotsDir, `profile_${vp.name}.png`),
      fullPage: false
    });
    await page.screenshot({
      path: path.join(screenshotsDir, `profile_full_${vp.name}.png`),
      fullPage: true
    });
  }

  console.log('--- 6. AUDITING PUBLIC AUTHOR PAGE /user/:id ---');
  if (otherUser) {
    const authorUrl = `/user/${otherUser._id.toString()}`;
    for (const vp of [viewports[2], viewports[7]]) {
      await page.setViewport({ width: vp.width, height: vp.height });
      await page.goto(`http://localhost:5173${authorUrl}`, { waitUntil: 'networkidle0' });
      await new Promise(r => setTimeout(r, 600));

      const overflow = await page.evaluate(() => {
        return document.documentElement.scrollWidth > window.innerWidth;
      });
      console.log(`AuthorPage (${otherUser.username}) ${vp.name}: overflow = ${overflow}`);

      await page.screenshot({
        path: path.join(screenshotsDir, `author_${vp.name}.png`),
        fullPage: false
      });
    }
  }

  console.log('--- 7. COMPUTED STYLING AUDIT ON 1440px ---');
  await page.setViewport({ width: 1440, height: 900 });
  await page.goto('http://localhost:5173/', { waitUntil: 'networkidle0' });
  const computedMetrics = await page.evaluate(() => {
    const pillar = document.querySelector('#why-postify .portal-card');
    const heroBtn = document.querySelector('section a button');
    const showcaseCard = document.querySelector('.portal-card');
    const footerContainer = document.querySelector('footer .portal-container');
    const dispatchBox = document.querySelector('footer .mb-12');
    const overlayWordmark = document.querySelector('footer span.editorial-h1');

    return {
      pillarCardPadding: pillar ? window.getComputedStyle(pillar).padding : null,
      heroBtnPadding: heroBtn ? window.getComputedStyle(heroBtn).padding : null,
      showcaseCardPadding: showcaseCard ? window.getComputedStyle(showcaseCard).padding : null,
      footerContainerMaxWidth: footerContainer ? window.getComputedStyle(footerContainer).maxWidth : null,
      dispatchBoxPadding: dispatchBox ? window.getComputedStyle(dispatchBox).padding : null,
      overlayWordmarkFont: overlayWordmark ? window.getComputedStyle(overlayWordmark).fontSize : null
    };
  });
  console.log('Computed metrics on 1440px:', computedMetrics);

  console.log('All Phase 11 screenshots & audits completed successfully in:', screenshotsDir);
  await browser.close();
}

runAudit().catch(err => {
  console.error('Audit run failed:', err);
  process.exit(1);
});
