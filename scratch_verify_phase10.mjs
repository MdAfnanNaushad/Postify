import puppeteer from 'puppeteer-core';
import fs from 'fs';
import path from 'path';

const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const screenshotsDir = 'c:/Users/User/Projects/Postify/screenshots/phase10';
const artifactDir = 'C:\\Users\\User\\.gemini\\antigravity-ide\\brain\\93d751f1-1cf8-41cb-b98a-8d48a7d3a43b';

if (!fs.existsSync(screenshotsDir)) {
  fs.mkdirSync(screenshotsDir, { recursive: true });
}

function copyToArtifacts(filename) {
  const src = path.join(screenshotsDir, filename);
  const dest = path.join(artifactDir, filename);
  if (fs.existsSync(src)) {
    fs.copyFileSync(src, dest);
    console.log(`Copied ${filename} to artifact directory.`);
  }
}

async function clickButtonWithText(page, text) {
  return await page.evaluate((btnText) => {
    const btns = Array.from(document.querySelectorAll('button, a'));
    const btn = btns.find((b) => b.innerText && b.innerText.trim().toLowerCase().includes(btnText.toLowerCase()));
    if (btn) {
      btn.click();
      return true;
    }
    return false;
  }, text);
}

async function runPhase10Acceptance() {
  console.log('🚀 Starting Phase 10: Weekly Developer Digest Acceptance Journeys...');

  const browser = await puppeteer.launch({
    executablePath: chromePath,
    headless: 'new',
    protocolTimeout: 120000,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  try {
    const ts = Date.now();
    const userA = {
      name: 'Dr. Evelyn Reed',
      username: `evelyn_p10_${ts}`,
      email: `evelyn_p10_${ts}@postify.io`,
      password: 'Password123!'
    };
    const userB = {
      name: 'Kai Takahashi',
      username: `kai_p10_${ts}`,
      email: `kai_p10_${ts}@postify.io`,
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

    // Register User A
    console.log(`[Setup] Registering User A (@${userA.username})...`);
    await pageA.goto('http://localhost:5173/register', { waitUntil: 'networkidle0' });
    await pageA.type('input[name="name"]', userA.name);
    await pageA.type('input[name="username"]', userA.username);
    await pageA.type('input[name="email"]', userA.email);
    await pageA.type('input[name="password"]', userA.password);
    await pageA.click('button[type="submit"]');
    await new Promise((r) => setTimeout(r, 2000));
    console.log('✓ User A registered.');

    // Register User B
    console.log(`[Setup] Registering User B (@${userB.username})...`);
    await pageB.goto('http://localhost:5173/register', { waitUntil: 'networkidle0' });
    await pageB.type('input[name="name"]', userB.name);
    await pageB.type('input[name="username"]', userB.username);
    await pageB.type('input[name="email"]', userB.email);
    await pageB.type('input[name="password"]', userB.password);
    await pageB.click('button[type="submit"]');
    await new Promise((r) => setTimeout(r, 2000));
    console.log('✓ User B registered.');

    // Extract User B's _id via /api/auth/me
    const userBId = await pageB.evaluate(async () => {
      const res = await fetch('/api/auth/me', { credentials: 'include' });
      const data = await res.json();
      return data.user?._id || data.user?.id;
    });
    console.log(`[Setup] User B ID: ${userBId}`);

    // User A follows User B
    console.log(`[Setup] User A follows User B...`);
    await pageA.evaluate(async (targetId) => {
      await fetch(`/api/follow/${targetId}`, {
        method: 'POST',
        credentials: 'include'
      });
    }, userBId);
    console.log('✓ User A followed User B.');

    // User B creates a post
    console.log(`[Setup] User B creates a technical post...`);
    await pageB.evaluate(async () => {
      await fetch('/api/posts', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: 'Deploying zero-copy serialization with FlatBuffers in our Go messaging gateway. Benchmark shows 4x memory savings #golang #performance'
        })
      });
    });
    console.log('✓ User B posted technical update.');

    // User B creates a public project and build log
    console.log(`[Setup] User B creates a public project and build log...`);
    const projectRes = await pageB.evaluate(async () => {
      const res = await fetch('/api/projects', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'FlatBuffers RPC Gateway',
          shortDescription: 'Ultra low-latency event broker in Go',
          description: 'High throughput event streaming architecture with FlatBuffers protocol',
          techStack: ['Go', 'FlatBuffers', 'gRPC'],
          visibility: 'public'
        })
      });
      return await res.json();
    });
    console.log('✓ Public project created:', projectRes.project?.slug);

    if (projectRes.project?._id) {
      await pageB.evaluate(async (projId) => {
        await fetch(`/api/projects/${projId}/logs`, {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: 'FlatBuffers Schema Verification',
            content: 'Successfully compiled schemas and integrated zero-alloc reader.',
            entryType: 'milestone'
          })
        });
      }, projectRes.project._id);
      console.log('✓ Build log created.');
    }

    // Generate digest for User A incorporating new activities
    console.log('[Setup] Triggering digest generation for User A...');
    await pageA.evaluate(async () => {
      await fetch('/api/digest/generate', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ force: true })
      });
    });

    // ==========================================
    // JOURNEY A: View Generated Weekly Digest
    // ==========================================
    console.log('\n--- JOURNEY A: Weekly Digest In-App Surface ---');
    console.log('[Journey A] User A navigates to /digest...');
    await pageA.goto('http://localhost:5173/digest', { waitUntil: 'networkidle0' });
    await new Promise((r) => setTimeout(r, 2000));

    // Verify sections rendered
    const digestContent = await pageA.evaluate(() => {
      const title = document.querySelector('h1')?.innerText || '';
      const banner = document.body.innerText.includes('Week of') || document.body.innerText.includes('Weekly Developer Digest');
      const hasFollowedPosts = document.body.innerText.includes('Updates From Followed Developers') || document.body.innerText.includes('FlatBuffers');
      const hasBuildLogs = document.body.innerText.includes('New Project Build Logs') || document.body.innerText.includes('FlatBuffers Schema');
      return { title, banner, hasFollowedPosts, hasBuildLogs };
    });
    console.log('[Journey A] Digest inspection:', digestContent);

    // Screenshot Journey A
    const shotA = path.join(screenshotsDir, '01_journey_a_digest_timeline.png');
    await pageA.screenshot({ path: shotA, fullPage: true });
    copyToArtifacts('01_journey_a_digest_timeline.png');
    console.log('✓ Captured Journey A Weekly Digest screenshot.');

    // Test clicking a linked project / build log from digest
    console.log('[Journey A] Clicking a build log link from digest...');
    const clickedLog = await pageA.evaluate(() => {
      const link = Array.from(document.querySelectorAll('a')).find(a => a.href && a.href.includes('/logs/'));
      if (link) {
        link.click();
        return true;
      }
      return false;
    });
    if (clickedLog) {
      await new Promise((r) => setTimeout(r, 1500));
      console.log(`✓ Navigated to linked build log: ${pageA.url()}`);
    }

    // ==========================================
    // JOURNEY B: Inactive / Empty-Week User
    // ==========================================
    console.log('\n--- JOURNEY B: Inactive User Empty State ---');
    // Context for a brand new user with 0 activity
    const userC = {
      name: 'Fresh Dev',
      username: `fresh_p10_${ts}`,
      email: `fresh_p10_${ts}@postify.io`,
      password: 'Password123!'
    };
    const contextC = await browser.createBrowserContext();
    const pageC = await contextC.newPage();
    await pageC.setViewport({ width: 1440, height: 900 });

    await pageC.goto('http://localhost:5173/register', { waitUntil: 'networkidle0' });
    await pageC.type('input[name="name"]', userC.name);
    await pageC.type('input[name="username"]', userC.username);
    await pageC.type('input[name="email"]', userC.email);
    await pageC.type('input[name="password"]', userC.password);
    await pageC.click('button[type="submit"]');
    await new Promise((r) => setTimeout(r, 2000));

    console.log('[Journey B] Fresh User C navigates to /digest...');
    await pageC.goto('http://localhost:5173/digest', { waitUntil: 'networkidle0' });
    await new Promise((r) => setTimeout(r, 2000));

    const emptyStateInfo = await pageC.evaluate(() => {
      return {
        hasEmptyNotice: document.body.innerText.includes('Clear') || document.body.innerText.includes('Quiet') || document.body.innerText.includes('No new updates'),
        hasDiscovery: document.body.innerText.includes('Browse') || document.body.innerText.includes('Feed') || document.body.innerText.includes('Highlights')
      };
    });
    console.log('[Journey B] Empty state evaluation:', emptyStateInfo);

    const shotB = path.join(screenshotsDir, '02_journey_b_empty_state.png');
    await pageC.screenshot({ path: shotB, fullPage: true });
    copyToArtifacts('02_journey_b_empty_state.png');
    console.log('✓ Captured Journey B Empty State screenshot.');

    // ==========================================
    // JOURNEY C: Cross-User Isolation
    // ==========================================
    console.log('\n--- JOURNEY C: Cross-User Isolation & Authorization ---');
    // Get User A's digest document ID
    const userADigestId = await pageA.evaluate(async () => {
      const res = await fetch('/api/digest/current', { credentials: 'include' });
      const data = await res.json();
      return data.digest?._id;
    });

    const isolationResult = await pageB.evaluate(async (targetDigestId) => {
      // 1. User B reads own preferences
      const prefRes = await fetch('/api/digest/preferences', { credentials: 'include' });
      const prefData = await prefRes.json();

      // 2. User B attempts to mark User A's digest as read
      let tamperStatus = 0;
      if (targetDigestId) {
        const patchRes = await fetch(`/api/digest/${targetDigestId}/read`, {
          method: 'PATCH',
          credentials: 'include'
        });
        tamperStatus = patchRes.status;
      }

      return {
        prefSuccess: prefData.success,
        tamperStatus
      };
    }, userADigestId);

    console.log('[Journey C] Cross-user authorization check:', isolationResult);
    if (isolationResult.tamperStatus === 403 || isolationResult.tamperStatus === 404) {
      console.log('✓ Cross-user digest mutation correctly rejected with status:', isolationResult.tamperStatus);
    }

    // ==========================================
    // JOURNEY D: Settings & Persistence
    // ==========================================
    console.log('\n--- JOURNEY D: User Preferences & Persistence ---');
    await pageA.goto('http://localhost:5173/digest', { waitUntil: 'networkidle0' });
    await new Promise((r) => setTimeout(r, 1000));

    // Open settings modal
    console.log('[Journey D] Opening Digest Settings Modal...');
    await clickButtonWithText(pageA, 'Settings');
    await new Promise((r) => setTimeout(r, 1000));

    // Capture settings modal
    const shotD1 = path.join(screenshotsDir, '04_journey_d_preferences_modal.png');
    await pageA.screenshot({ path: shotD1, fullPage: false });
    copyToArtifacts('04_journey_d_preferences_modal.png');
    console.log('✓ Captured Digest Settings Modal screenshot.');

    // Toggle delivery day to 'friday' and save
    console.log('[Journey D] Updating delivery day to Friday...');
    await pageA.select('select', 'friday');
    await new Promise((r) => setTimeout(r, 500));
    await clickButtonWithText(pageA, 'Save Settings');
    await new Promise((r) => setTimeout(r, 1500));

    // Reload page and check persistence
    console.log('[Journey D] Reloading page to verify persistence...');
    await pageA.reload({ waitUntil: 'networkidle0' });
    await new Promise((r) => setTimeout(r, 1000));
    await clickButtonWithText(pageA, 'Settings');
    await new Promise((r) => setTimeout(r, 1000));

    const persistedDay = await pageA.evaluate(() => {
      const select = document.querySelector('select');
      return select ? select.value : null;
    });
    console.log('[Journey D] Persisted deliveryDay value:', persistedDay);

    const shotD2 = path.join(screenshotsDir, '04_journey_d_persisted_settings.png');
    await pageA.screenshot({ path: shotD2, fullPage: false });
    copyToArtifacts('04_journey_d_persisted_settings.png');

    // Close settings modal
    await clickButtonWithText(pageA, 'Cancel');
    await new Promise((r) => setTimeout(r, 500));

    // ==========================================
    // JOURNEY E: Email Provider Status & Fallback
    // ==========================================
    console.log('\n--- JOURNEY E: Email Provider Status Verification ---');
    await clickButtonWithText(pageA, 'Settings');
    await new Promise((r) => setTimeout(r, 800));

    const emailNotice = await pageA.evaluate(() => {
      return document.body.innerText.includes('SMTP email provider is not currently configured') ||
             document.body.innerText.includes('In-app digests remain active');
    });
    console.log('[Journey E] Verified clear unconfigured email provider notice:', emailNotice);

    const shotE = path.join(screenshotsDir, '05_journey_e_email_status.png');
    await pageA.screenshot({ path: shotE, fullPage: false });
    copyToArtifacts('05_journey_e_email_status.png');

    await clickButtonWithText(pageA, 'Cancel');
    await new Promise((r) => setTimeout(r, 500));

    // ==========================================
    // JOURNEY F: Responsive & Theme Verification
    // ==========================================
    console.log('\n--- JOURNEY F: Responsive & Theme Audit ---');
    // 1. Desktop Dark
    await pageA.setViewport({ width: 1440, height: 900 });
    await pageA.evaluate(() => {
      document.documentElement.classList.add('dark');
      document.documentElement.classList.remove('light');
    });
    await new Promise((r) => setTimeout(r, 800));
    const shotF1 = path.join(screenshotsDir, '06_journey_f_desktop_dark.png');
    await pageA.screenshot({ path: shotF1, fullPage: true });
    copyToArtifacts('06_journey_f_desktop_dark.png');
    console.log('✓ Captured Desktop Dark mode screenshot.');

    // 2. Desktop Light
    await pageA.evaluate(() => {
      document.documentElement.classList.add('light');
      document.documentElement.classList.remove('dark');
    });
    await new Promise((r) => setTimeout(r, 800));
    const shotF2 = path.join(screenshotsDir, '07_journey_f_desktop_light.png');
    await pageA.screenshot({ path: shotF2, fullPage: true });
    copyToArtifacts('07_journey_f_desktop_light.png');
    console.log('✓ Captured Desktop Light mode screenshot.');

    // 3. Mobile Dark (390px iPhone width)
    await pageA.setViewport({ width: 390, height: 844 });
    await pageA.evaluate(() => {
      document.documentElement.classList.add('dark');
      document.documentElement.classList.remove('light');
    });
    await new Promise((r) => setTimeout(r, 800));
    const shotF3 = path.join(screenshotsDir, '08_journey_f_mobile_dark.png');
    await pageA.screenshot({ path: shotF3, fullPage: true });
    copyToArtifacts('08_journey_f_mobile_dark.png');
    console.log('✓ Captured Mobile Dark mode screenshot.');

    // 4. Mobile Light (390px iPhone width)
    await pageA.evaluate(() => {
      document.documentElement.classList.add('light');
      document.documentElement.classList.remove('dark');
    });
    await new Promise((r) => setTimeout(r, 800));
    const shotF4 = path.join(screenshotsDir, '09_journey_f_mobile_light.png');
    await pageA.screenshot({ path: shotF4, fullPage: true });
    copyToArtifacts('09_journey_f_mobile_light.png');
    console.log('✓ Captured Mobile Light mode screenshot.');

    console.log('\n🎉 All Phase 10 Acceptance Journeys completed successfully!');
  } catch (err) {
    console.error('❌ Phase 10 Acceptance error:', err);
    throw err;
  } finally {
    await browser.close();
  }
}

runPhase10Acceptance();
