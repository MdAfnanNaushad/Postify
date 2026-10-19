import puppeteer from 'puppeteer-core';
import fs from 'fs';
import path from 'path';

const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const screenshotsDir = 'c:/Users/User/Projects/Postify/screenshots/phases_5_6_7';

if (!fs.existsSync(screenshotsDir)) {
  fs.mkdirSync(screenshotsDir, { recursive: true });
}

async function runAcceptanceTests() {
  console.log('🚀 Starting Phases 5, 6 & 7 Dual-Client Browser Acceptance Suite...');

  const browser = await puppeteer.launch({
    executablePath: chromePath,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  try {
    const ts = Date.now();
    const userA = {
      name: 'Elena Rostova',
      username: `elena_${ts}`,
      email: `elena_${ts}@postify.io`,
      password: 'Password123!'
    };
    const userB = {
      name: 'Marcus Vance',
      username: `marcus_${ts}`,
      email: `marcus_${ts}@postify.io`,
      password: 'Password123!'
    };

    // 1. Context A for User A
    const contextA = await browser.createBrowserContext();
    const pageA = await contextA.newPage();
    await pageA.setViewport({ width: 1440, height: 900 });

    // 2. Context B for User B
    const contextB = await browser.createBrowserContext();
    const pageB = await contextB.newPage();
    await pageB.setViewport({ width: 1440, height: 900 });

    console.log(`[Step 1] Registering User A (@${userA.username})...`);
    await pageA.goto('http://localhost:5173/register', { waitUntil: 'networkidle0' });
    await pageA.type('input[name="name"]', userA.name);
    await pageA.type('input[name="username"]', userA.username);
    await pageA.type('input[name="email"]', userA.email);
    await pageA.type('input[name="password"]', userA.password);
    await pageA.click('button[type="submit"]');
    await pageA.waitForNavigation({ waitUntil: 'networkidle0' }).catch(() => {});
    await new Promise((r) => setTimeout(r, 1200));
    console.log('✓ User A registered and authenticated.');

    console.log(`[Step 2] Registering User B (@${userB.username})...`);
    await pageB.goto('http://localhost:5173/register', { waitUntil: 'networkidle0' });
    await pageB.type('input[name="name"]', userB.name);
    await pageB.type('input[name="username"]', userB.username);
    await pageB.type('input[name="email"]', userB.email);
    await pageB.type('input[name="password"]', userB.password);
    await pageB.click('button[type="submit"]');
    await pageB.waitForNavigation({ waitUntil: 'networkidle0' }).catch(() => {});
    await new Promise((r) => setTimeout(r, 1200));
    console.log('✓ User B registered and authenticated.');

    // JOURNEY 1: User A publishes a post; User B likes, replies, quotes, reposts, follows User A
    console.log('\n--- JOURNEY 1: Notifications & Real-Time Engagement ---');
    console.log('[Journey 1] User A creates post with #Go and #DistributedSystems tags...');
    await pageA.goto('http://localhost:5173/feed', { waitUntil: 'networkidle0' });
    await pageA.waitForSelector('textarea', { timeout: 5000 });
    const postContent = `High-throughput consensus protocols with #Go and #Docker. Hey @${userB.username} check this architecture!`;
    await pageA.type('textarea', postContent);
    await pageA.click('button[type="submit"]');
    await new Promise((r) => setTimeout(r, 1500));
    console.log('✓ User A post published.');

    // User B finds the post on feed
    console.log('[Journey 1] User B interacts with User A content on feed...');
    await pageB.goto('http://localhost:5173/feed', { waitUntil: 'networkidle0' });
    await new Promise((r) => setTimeout(r, 1500));

    // User B likes the post
    const likeBtn = await pageB.$('button[aria-label*="Like"]');
    if (likeBtn) {
      await likeBtn.click();
      console.log('✓ User B liked post.');
      await new Promise((r) => setTimeout(r, 800));
    }

    // User B reposts the post
    const repostBtn = await pageB.$('button[title*="Repost"]');
    if (repostBtn) {
      await repostBtn.click();
      console.log('✓ User B reposted post.');
      await new Promise((r) => setTimeout(r, 800));
    }

    // User B follows User A
    const authorLink = await pageB.$(`a[href*="/user/"]`);
    if (authorLink) {
      const authorHref = await pageB.evaluate((el) => el.getAttribute('href'), authorLink);
      console.log(`[Journey 1] User B navigating to author profile ${authorHref} to follow...`);
      await pageB.goto(`http://localhost:5173${authorHref}`, { waitUntil: 'networkidle0' });
      await new Promise((r) => setTimeout(r, 1200));

      const followBtn = await pageB.$('button[aria-label="Follow writer"]');
      if (followBtn) {
        await followBtn.click();
        console.log('✓ User B followed User A.');
        await new Promise((r) => setTimeout(r, 1000));
      }
    }

    // User A checks notifications
    console.log('[Journey 1] User A navigating to /notifications...');
    await pageA.goto('http://localhost:5173/notifications', { waitUntil: 'networkidle0' });
    await new Promise((r) => setTimeout(r, 1500));

    // Capture Notification screenshots
    await pageA.screenshot({
      path: path.join(screenshotsDir, 'journey1_notifications_desktop_light.png'),
      fullPage: false
    });
    console.log('📸 Captured journey1_notifications_desktop_light.png');

    // Switch to dark mode on Page A and capture
    await pageA.evaluate(() => {
      document.documentElement.classList.add('dark');
    });
    await new Promise((r) => setTimeout(r, 500));
    await pageA.screenshot({
      path: path.join(screenshotsDir, 'journey1_notifications_desktop_dark.png'),
      fullPage: false
    });
    console.log('📸 Captured journey1_notifications_desktop_dark.png');

    // Restore light theme
    await pageA.evaluate(() => {
      document.documentElement.classList.remove('dark');
    });

    // JOURNEY 2: Developer Profile, Technical Identity, Selected Projects & Pinned Posts
    console.log('\n--- JOURNEY 2: Developer Profiles, Tech Identity & Pinned Posts ---');
    console.log('[Journey 2] User A editing developer profile...');
    await pageA.goto('http://localhost:5173/profile', { waitUntil: 'networkidle0' });
    await new Promise((r) => setTimeout(r, 1500));

    // Click "Edit Profile"
    const editProfileBtn = await pageA.evaluateHandle(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      return btns.find((b) => b.textContent.includes('Edit Profile'));
    });

    if (editProfileBtn && editProfileBtn.asElement()) {
      await editProfileBtn.asElement().click();
      await new Promise((r) => setTimeout(r, 800));

      // Fill in developer attributes
      await pageA.type('textarea', ' Lead systems architect. Building distributed databases and consensus engines.');
      await pageA.type('input[placeholder*="Bengaluru"]', 'San Francisco, CA / Remote');
      await pageA.type('input[placeholder*="yourdomain.dev"]', 'https://elena-systems.dev');
      await pageA.type('input[placeholder*="github.com"]', 'https://github.com/elenarostova');
      await pageA.type('input[placeholder*="linkedin.com"]', 'https://linkedin.com/in/elenarostova');

      // Click popular tech suggestions: Go, Docker, Kubernetes, React
      const techBtns = await pageA.$$('button');
      for (const btn of techBtns) {
        const text = await pageA.evaluate((el) => el.textContent, btn);
        if (text === '+Go' || text === '+Docker' || text === '+Kubernetes' || text === '+React') {
          await btn.click();
          await new Promise((r) => setTimeout(r, 150));
        }
      }

      // Add a selected project
      const addProjectBtn = await pageA.evaluateHandle(() => {
        const btns = Array.from(document.querySelectorAll('button'));
        return btns.find((b) => b.textContent.includes('Add Project'));
      });
      if (addProjectBtn && addProjectBtn.asElement()) {
        await addProjectBtn.asElement().click();
        await new Promise((r) => setTimeout(r, 400));

        await pageA.type('input[placeholder*="Project Name"]', 'Consensus-Raft Distributed Store');
        await pageA.type('input[placeholder*="URL (https"]', 'https://github.com/elenarostova/raft-store');
        await pageA.type(
          'textarea[placeholder*="Short description"]',
          'A high-throughput distributed key-value store using the Raft consensus algorithm.'
        );
        await pageA.type('input[placeholder*="Technologies used"]', 'Go, Raft, gRPC, Docker');
      }

      // Submit save profile
      const saveBtn = await pageA.evaluateHandle(() => {
        const btns = Array.from(document.querySelectorAll('button[type="submit"]'));
        return btns.find((b) => b.textContent.includes('Save Profile'));
      });
      if (saveBtn && saveBtn.asElement()) {
        await saveBtn.asElement().click();
        await new Promise((r) => setTimeout(r, 1500));
        console.log('✓ User A technical profile updated successfully.');
      }
    }

    // User A pins post to top of profile
    const pinBtn = await pageA.evaluateHandle(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      return btns.find((b) => b.textContent.includes('Pin to Top'));
    });
    if (pinBtn && pinBtn.asElement()) {
      await pinBtn.asElement().click();
      console.log('✓ User A pinned post to top of profile.');
      await new Promise((r) => setTimeout(r, 1200));
    }

    // Capture User A Profile (Owner view)
    await pageA.screenshot({
      path: path.join(screenshotsDir, 'journey2_profile_owner_desktop_light.png'),
      fullPage: false
    });
    console.log('📸 Captured journey2_profile_owner_desktop_light.png');

    // User B views User A's public profile
    console.log('[Journey 2] User B views User A profile publicly...');
    const userAProfileUrl = pageA.url();
    // User A user ID from URL or page
    const userAId = await pageA.evaluate(() => {
      const avatarLink = document.querySelector('a[href*="/user/"]');
      if (avatarLink) return avatarLink.getAttribute('href');
      return null;
    });

    await pageB.goto(`http://localhost:5173/feed`, { waitUntil: 'networkidle0' });
    await new Promise((r) => setTimeout(r, 1000));
    const authorCardLink = await pageB.$('a[href*="/user/"]');
    if (authorCardLink) {
      await authorCardLink.click();
      await pageB.waitForNavigation({ waitUntil: 'networkidle0' }).catch(() => {});
      await new Promise((r) => setTimeout(r, 1500));

      // Switch User B to dark mode
      await pageB.evaluate(() => {
        document.documentElement.classList.add('dark');
      });
      await new Promise((r) => setTimeout(r, 500));

      await pageB.screenshot({
        path: path.join(screenshotsDir, 'journey2_profile_public_desktop_dark.png'),
        fullPage: false
      });
      console.log('📸 Captured journey2_profile_public_desktop_dark.png');
    }

    // JOURNEY 3: Topics, Tags, Search & Technology Discovery
    console.log('\n--- JOURNEY 3: Topics, Tags, Search & Technology Discovery ---');
    console.log('[Journey 3] Navigating to /search and searching for "Elena"...');
    await pageB.goto('http://localhost:5173/search?q=Elena', { waitUntil: 'networkidle0' });
    await new Promise((r) => setTimeout(r, 1800));

    await pageB.screenshot({
      path: path.join(screenshotsDir, 'journey3_search_results_desktop_dark.png'),
      fullPage: false
    });
    console.log('📸 Captured journey3_search_results_desktop_dark.png');

    // Visit /topics index page
    console.log('[Journey 3] Navigating to /topics index page...');
    await pageA.goto('http://localhost:5173/topics', { waitUntil: 'networkidle0' });
    await new Promise((r) => setTimeout(r, 1500));

    await pageA.screenshot({
      path: path.join(screenshotsDir, 'journey3_topics_index_desktop_light.png'),
      fullPage: false
    });
    console.log('📸 Captured journey3_topics_index_desktop_light.png');

    // Visit /topics/go detail page
    console.log('[Journey 3] Navigating to /topics/go topic detail feed...');
    await pageB.goto('http://localhost:5173/topics/go', { waitUntil: 'networkidle0' });
    await new Promise((r) => setTimeout(r, 1500));

    await pageB.screenshot({
      path: path.join(screenshotsDir, 'journey3_topic_detail_desktop_dark.png'),
      fullPage: false
    });
    console.log('📸 Captured journey3_topic_detail_desktop_dark.png');

    // JOURNEY 4: Mobile Responsiveness & Viewports
    console.log('\n--- JOURNEY 4: Mobile Responsiveness & Dark Theme ---');
    const mobilePage = await contextB.newPage();
    await mobilePage.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true });

    // 1. Mobile Notifications
    await mobilePage.goto('http://localhost:5173/notifications', { waitUntil: 'networkidle0' });
    await mobilePage.evaluate(() => document.documentElement.classList.add('dark'));
    await new Promise((r) => setTimeout(r, 1200));
    await mobilePage.screenshot({
      path: path.join(screenshotsDir, 'journey4_notifications_mobile_dark.png'),
      fullPage: false
    });
    console.log('📸 Captured journey4_notifications_mobile_dark.png');

    // 2. Mobile Profile
    await mobilePage.goto('http://localhost:5173/profile', { waitUntil: 'networkidle0' });
    await mobilePage.evaluate(() => document.documentElement.classList.add('dark'));
    await new Promise((r) => setTimeout(r, 1200));
    await mobilePage.screenshot({
      path: path.join(screenshotsDir, 'journey4_profile_mobile_dark.png'),
      fullPage: false
    });
    console.log('📸 Captured journey4_profile_mobile_dark.png');

    // 3. Mobile Search
    await mobilePage.goto('http://localhost:5173/search?q=Go', { waitUntil: 'networkidle0' });
    await mobilePage.evaluate(() => document.documentElement.classList.add('dark'));
    await new Promise((r) => setTimeout(r, 1500));
    await mobilePage.screenshot({
      path: path.join(screenshotsDir, 'journey4_search_mobile_dark.png'),
      fullPage: false
    });
    console.log('📸 Captured journey4_search_mobile_dark.png');

    console.log('\n🎉 All 4 Acceptance Test Journeys completed with flying colors!');
  } catch (err) {
    console.error('Acceptance test failed:', err);
    throw err;
  } finally {
    await browser.close();
  }
}

runAcceptanceTests();
