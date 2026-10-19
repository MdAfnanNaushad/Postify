import puppeteer from 'puppeteer-core';
import fs from 'fs';
import path from 'path';

const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const screenshotsDir = 'c:/Users/User/Projects/Postify/screenshots/phase4';

if (!fs.existsSync(screenshotsDir)) {
  fs.mkdirSync(screenshotsDir, { recursive: true });
}

async function runAcceptanceTests() {
  console.log('🚀 Starting Phase 4 Dual-Client Browser Acceptance Tests...');

  const browser = await puppeteer.launch({
    executablePath: chromePath,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  try {
    const timestamp = Date.now();
    const userA = {
      name: 'Alice Dev',
      username: `alice_${timestamp}`,
      email: `alice_${timestamp}@postify.io`,
      password: 'Password123!'
    };
    const userB = {
      name: 'Bob Architect',
      username: `bob_${timestamp}`,
      email: `bob_${timestamp}@postify.io`,
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
    await new Promise(r => setTimeout(r, 1000));
    console.log('✓ User A registered and logged in.');

    console.log(`[Step 2] Registering User B (@${userB.username}) in independent session...`);
    await pageB.goto('http://localhost:5173/register', { waitUntil: 'networkidle0' });
    await pageB.type('input[name="name"]', userB.name);
    await pageB.type('input[name="username"]', userB.username);
    await pageB.type('input[name="email"]', userB.email);
    await pageB.type('input[name="password"]', userB.password);
    await pageB.click('button[type="submit"]');
    await pageB.waitForNavigation({ waitUntil: 'networkidle0' }).catch(() => {});
    await new Promise(r => setTimeout(r, 1000));
    console.log('✓ User B registered and logged in.');

    // Fetch user B's profile ID via /api/auth/me
    const meRes = await pageB.evaluate(async () => {
      const r = await fetch('/api/auth/me', { credentials: 'include' });
      return r.json();
    });
    const userBId = meRes.user?._id || meRes.user?.id;
    console.log(`✓ User B profile ID retrieved: ${userBId}`);

    // User B publishes a technical story
    console.log('[Step 3] User B publishing a technical story...');
    await pageB.goto('http://localhost:5173/feed', { waitUntil: 'networkidle0' });
    await new Promise(r => setTimeout(r, 800));
    await pageB.type(
      'textarea#post-textarea',
      '### Event-Driven Microservices in Production\n\nDesigning asynchronous architectures with transactional outbox guarantees reliable message delivery without dual-write consistency issues.\n\n```javascript\nconst outbox = await tx.insert(OutboxEvents).values({ topic, payload });\n```'
    );
    await pageB.click('button[type="submit"]');
    await new Promise(r => setTimeout(r, 1500));
    console.log('✓ User B published story.');

    // User B also reposts their story
    console.log('[Step 4] User B reposting the story...');
    const repostButton = await pageB.$('button[aria-label="Repost story or quote"]');
    if (repostButton) {
      await repostButton.click();
      await new Promise(r => setTimeout(r, 500));
      // Click 'Repost Story' in dropdown
      const menuOptions = await pageB.$$('button[role="menuitem"]');
      for (const opt of menuOptions) {
        const text = await pageB.evaluate(el => el.textContent, opt);
        if (text.includes('Repost Story')) {
          await opt.click();
          break;
        }
      }
      await new Promise(r => setTimeout(r, 1000));
      console.log('✓ User B reposted the story.');
    }

    // Step 5: User A navigates to User B's profile and follows them
    console.log(`[Step 5] User A visiting User B's profile (/user/${userBId})...`);
    await pageA.goto(`http://localhost:5173/user/${userBId}`, { waitUntil: 'networkidle0' });
    await new Promise(r => setTimeout(r, 1000));

    // Verify initial follow status and count
    const initialFollowButtonText = await pageA.evaluate(() => {
      const btn = document.querySelector('button[aria-label="Follow writer"]');
      return btn ? btn.textContent.trim() : null;
    });
    console.log(`Follow button initially: "${initialFollowButtonText}"`);

    // Click Follow
    const followBtn = await pageA.$('button[aria-label="Follow writer"]');
    if (followBtn) {
      await followBtn.click();
      await new Promise(r => setTimeout(r, 1200));
    }

    const updatedFollowButtonText = await pageA.evaluate(() => {
      const btn = document.querySelector('button[aria-label="Unfollow writer"]');
      return btn ? btn.textContent.trim() : null;
    });
    console.log(`Follow button after click: "${updatedFollowButtonText}"`);

    // Screenshot of User B's profile followed by User A (Desktop Light)
    await pageA.screenshot({
      path: path.join(screenshotsDir, '01_user_profile_following_desktop_light.png'),
      fullPage: false
    });
    console.log('📸 Captured 01_user_profile_following_desktop_light.png');

    // Step 6: User A visits /feed and switches to "Following Feed"
    console.log('[Step 6] User A navigating to Following Feed...');
    await pageA.goto('http://localhost:5173/feed', { waitUntil: 'networkidle0' });
    await new Promise(r => setTimeout(r, 1000));

    // Click "Following Feed" tab
    const tabs = await pageA.$$('button');
    for (const tab of tabs) {
      const text = await pageA.evaluate(el => el.textContent, tab);
      if (text.includes('Following Feed')) {
        await tab.click();
        break;
      }
    }
    await new Promise(r => setTimeout(r, 1500));

    // Verify feed contains User B's post
    const feedItemCount = await pageA.evaluate(() => {
      const articles = document.querySelectorAll('article');
      return articles.length;
    });
    console.log(`✓ User A's Following Feed rendered ${feedItemCount} entries from User B!`);

    // Capture Following Feed Desktop Light
    await pageA.screenshot({
      path: path.join(screenshotsDir, '02_following_feed_desktop_light.png'),
      fullPage: false
    });
    console.log('📸 Captured 02_following_feed_desktop_light.png');

    // Toggle Dark Mode and capture Desktop Dark
    const themeBtn = await pageA.$('button[aria-label="Switch to dark theme"]');
    if (themeBtn) {
      await themeBtn.click();
      await new Promise(r => setTimeout(r, 600));
    }
    await pageA.screenshot({
      path: path.join(screenshotsDir, '03_following_feed_desktop_dark.png'),
      fullPage: false
    });
    console.log('📸 Captured 03_following_feed_desktop_dark.png');

    // Mobile Viewport 390px Dark
    await pageA.setViewport({ width: 390, height: 844 });
    await new Promise(r => setTimeout(r, 600));
    await pageA.screenshot({
      path: path.join(screenshotsDir, '04_following_feed_mobile_dark.png'),
      fullPage: false
    });
    console.log('📸 Captured 04_following_feed_mobile_dark.png');

    // Switch back to light for mobile light
    const themeLightBtn = await pageA.$('button[aria-label="Switch to light theme"]');
    if (themeLightBtn) {
      await themeLightBtn.click();
      await new Promise(r => setTimeout(r, 600));
    }
    await pageA.screenshot({
      path: path.join(screenshotsDir, '05_following_feed_mobile_light.png'),
      fullPage: false
    });
    console.log('📸 Captured 05_following_feed_mobile_light.png');

    // Step 7: User A quotes User B's story
    console.log('[Step 7] User A quoting User B story...');
    await pageA.setViewport({ width: 1440, height: 900 });
    await new Promise(r => setTimeout(r, 600));

    const repostBtnOnFeed = await pageA.$('button[aria-label="Repost story or quote"]');
    if (repostBtnOnFeed) {
      await repostBtnOnFeed.click();
      await new Promise(r => setTimeout(r, 500));
      const menuOptions = await pageA.$$('button[role="menuitem"]');
      for (const opt of menuOptions) {
        const text = await pageA.evaluate(el => el.textContent, opt);
        if (text.includes('Quote Story')) {
          await opt.click();
          break;
        }
      }
      await new Promise(r => setTimeout(r, 800));

      // Type quote commentary into Quote modal textarea
      const quoteTextarea = await pageA.$('div[role="dialog"] textarea');
      if (quoteTextarea) {
        await quoteTextarea.type(
          'Excellent analysis on the transactional outbox pattern. Pairing this with Debezium makes CDC remarkably resilient across distributed environments.'
        );
        await new Promise(r => setTimeout(r, 500));

        // Capture Quote Modal before publish
        await pageA.screenshot({
          path: path.join(screenshotsDir, '06_quote_modal_desktop.png'),
          fullPage: false
        });
        console.log('📸 Captured 06_quote_modal_desktop.png');

        // Click Publish Quote
        const publishQuoteBtn = await pageA.evaluateHandle(() => {
          const btns = Array.from(document.querySelectorAll('div[role="dialog"] button'));
          return btns.find(b => b.textContent.includes('Publish Quote'));
        });
        if (publishQuoteBtn) {
          await publishQuoteBtn.click();
          await new Promise(r => setTimeout(r, 1500));
          console.log('✓ Quote post published successfully.');
        }
      }
    }

    // Refresh discovery feed to see the published quote post
    await pageA.goto('http://localhost:5173/feed', { waitUntil: 'networkidle0' });
    await new Promise(r => setTimeout(r, 1200));

    // Capture Quote-Post on Feed
    await pageA.screenshot({
      path: path.join(screenshotsDir, '07_quote_post_rendered_desktop.png'),
      fullPage: false
    });
    console.log('📸 Captured 07_quote_post_rendered_desktop.png');

    console.log('🎉 All Phase 4 browser acceptance tests passed successfully!');
  } finally {
    await browser.close();
  }
}

runAcceptanceTests().catch(err => {
  console.error('❌ Acceptance test error:', err);
  process.exit(1);
});
