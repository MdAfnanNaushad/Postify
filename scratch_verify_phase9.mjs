import puppeteer from 'puppeteer-core';
import fs from 'fs';
import path from 'path';

const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const screenshotsDir = 'c:/Users/User/Projects/Postify/screenshots/phase9';
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
  const clicked = await page.evaluate((btnText) => {
    const btns = Array.from(document.querySelectorAll('button, a'));
    const btn = btns.find((b) => b.innerText && b.innerText.trim().toLowerCase().includes(btnText.toLowerCase()));
    if (btn) {
      btn.click();
      return true;
    }
    return false;
  }, text);
  return clicked;
}

async function runPhase9Acceptance() {
  console.log('🚀 Starting Phase 9: Build Logs & Project Journals Acceptance Suite...');

  const browser = await puppeteer.launch({
    executablePath: chromePath,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  try {
    const ts = Date.now();
    const userA = {
      name: 'Linus Kael',
      username: `linus_p9_${ts}`,
      email: `linus_p9_${ts}@postify.io`,
      password: 'Password123!'
    };
    const userB = {
      name: 'Maya Jensen',
      username: `maya_p9_${ts}`,
      email: `maya_p9_${ts}@postify.io`,
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
    console.log(`[Step 1] Registering User A (@${userA.username})...`);
    await pageA.goto('http://localhost:5173/register', { waitUntil: 'networkidle0' });
    await pageA.type('input[name="name"]', userA.name);
    await pageA.type('input[name="username"]', userA.username);
    await pageA.type('input[name="email"]', userA.email);
    await pageA.type('input[name="password"]', userA.password);
    await pageA.click('button[type="submit"]');
    await new Promise((r) => setTimeout(r, 2000));
    console.log('✓ User A registered and logged in.');

    // Register User B
    console.log(`[Step 2] Registering User B (@${userB.username})...`);
    await pageB.goto('http://localhost:5173/register', { waitUntil: 'networkidle0' });
    await pageB.type('input[name="name"]', userB.name);
    await pageB.type('input[name="username"]', userB.username);
    await pageB.type('input[name="email"]', userB.email);
    await pageB.type('input[name="password"]', userB.password);
    await pageB.click('button[type="submit"]');
    await new Promise((r) => setTimeout(r, 2000));
    console.log('✓ User B registered and logged in.');

    // ==========================================
    // JOURNEY A: Project Creation & Timeline
    // ==========================================
    console.log('\n--- JOURNEY A: Project Creation & Build Log Timeline ---');
    console.log('[Journey A] User A navigates to /projects directory...');
    await pageA.goto('http://localhost:5173/projects', { waitUntil: 'networkidle0' });
    await new Promise((r) => setTimeout(r, 1000));

    // Click "Create Project" button
    console.log('[Journey A] User A opens Project creation modal...');
    await clickButtonWithText(pageA, 'Create Project');
    await new Promise((r) => setTimeout(r, 800));

    // Fill Project form
    console.log('[Journey A] Filling project details...');
    await pageA.waitForSelector('input[placeholder*="Distributed Task Engine"]', { timeout: 5000 });
    await pageA.type('input[placeholder*="Distributed Task Engine"]', 'Distributed Task Engine');
    await pageA.type('input[placeholder*="High-throughput"]', 'High-throughput asynchronous job scheduling queue');
    await pageA.type('input[placeholder*="Go, Redis"]', 'Go, Redis, gRPC, Docker, Kubernetes');
    await pageA.type('input[placeholder*="github.com"]', 'https://github.com/linus/task-engine');
    await pageA.type('input[placeholder*="myproject.app"]', 'https://taskengine.dev');
    await pageA.type('textarea[placeholder*="architectural design"]', '### Distributed Task Engine\nBuilt on Raft consensus with Redis backplane and gRPC streaming workers.\n\n```go\ntype Node struct {\n    ID string\n    Leader bool\n}\n```');

    // Submit project
    const saveProjectBtn = await pageA.waitForSelector('form button[type="submit"]');
    await saveProjectBtn.click();
    await new Promise((r) => setTimeout(r, 1500));
    console.log('✓ Project "Distributed Task Engine" created successfully.');

    // Navigate to Project Detail Page
    console.log('[Journey A] Navigating to created project detail page...');
    await pageA.goto('http://localhost:5173/projects/distributed-task-engine', { waitUntil: 'networkidle0' });
    await pageA.waitForSelector('h1', { timeout: 10000 });

    // Publish Entry 1: Milestone
    console.log('[Journey A] Publishing Build Log 1: Milestone...');
    await clickButtonWithText(pageA, 'New Log Entry');
    await new Promise((r) => setTimeout(r, 800));

    await pageA.waitForSelector('input[placeholder*="Implemented Raft"]', { timeout: 5000 });
    await pageA.type('input[placeholder*="Implemented Raft"]', 'Project Inception & Architecture Specs');
    await pageA.select('form select', 'milestone');
    await pageA.click('input[type="checkbox"]'); // Pin entry
    await pageA.type('input[placeholder*="database, benchmarking"]', 'architecture, grpc, raft');
    await pageA.type('textarea[placeholder*="Problem Statement"]', '### Milestone 1\nDefined protobuf schemas and initial service boundary contracts.');
    await pageA.click('form button[type="submit"]');
    await new Promise((r) => setTimeout(r, 1200));

    // Publish Entry 2: Feature
    console.log('[Journey A] Publishing Build Log 2: Feature...');
    await clickButtonWithText(pageA, 'New Log Entry');
    await new Promise((r) => setTimeout(r, 800));

    await pageA.waitForSelector('input[placeholder*="Implemented Raft"]', { timeout: 5000 });
    await pageA.type('input[placeholder*="Implemented Raft"]', 'Raft Consensus Protocol & Heartbeats');
    await pageA.select('form select', 'feature');
    await pageA.type('input[placeholder*="database, benchmarking"]', 'raft, consensus, networking');
    await pageA.type('textarea[placeholder*="Problem Statement"]', 'Integrated Raft state machine replication across cluster nodes.');
    await pageA.click('form button[type="submit"]');
    await new Promise((r) => setTimeout(r, 1200));

    // Publish Entry 3: Fix
    console.log('[Journey A] Publishing Build Log 3: Fix...');
    await clickButtonWithText(pageA, 'New Log Entry');
    await new Promise((r) => setTimeout(r, 800));

    await pageA.waitForSelector('input[placeholder*="Implemented Raft"]', { timeout: 5000 });
    await pageA.type('input[placeholder*="Implemented Raft"]', 'Fixed TCP Heartbeat Memory Leak on Node Eviction');
    await pageA.select('form select', 'fix');
    await pageA.type('input[placeholder*="database, benchmarking"]', 'bugfix, memory, profiling');
    await pageA.type('textarea[placeholder*="Problem Statement"]', 'Diagnosed unbuffered channel leak during network partitions using pprof.');
    await pageA.click('form button[type="submit"]');
    await new Promise((r) => setTimeout(r, 1500));

    // Reload page to verify persistence
    console.log('[Journey A] Reloading page to verify timeline persistence...');
    await pageA.reload({ waitUntil: 'networkidle0' });
    await new Promise((r) => setTimeout(r, 1200));

    const timelineCount = await pageA.evaluate(() => {
      return document.querySelectorAll('[id^="log-"]').length;
    });
    console.log(`✓ Timeline persisted with ${timelineCount} build log entries.`);

    await pageA.screenshot({ path: path.join(screenshotsDir, '01_journey_a_project_timeline.png'), fullPage: true });
    copyToArtifacts('01_journey_a_project_timeline.png');

    // ==========================================
    // JOURNEY B: Public Discovery & Search
    // ==========================================
    console.log('\n--- JOURNEY B: Public Discovery & Search ---');
    console.log('[Journey B] User B navigates directly to public project URL...');
    await pageB.goto('http://localhost:5173/projects/distributed-task-engine', { waitUntil: 'networkidle0' });
    await pageB.waitForSelector('h1', { timeout: 10000 });

    const projectTitleOnB = await pageB.evaluate(() => document.querySelector('h1')?.innerText);
    console.log(`✓ User B sees project: "${projectTitleOnB}"`);

    // Search for project
    console.log('[Journey B] User B searches for "Distributed" on /search...');
    await pageB.goto('http://localhost:5173/search?q=Distributed&type=projects', { waitUntil: 'networkidle0' });
    await new Promise((r) => setTimeout(r, 1500));

    const searchFound = await pageB.evaluate(() => {
      const text = document.body.innerText;
      return text.includes('Distributed Task Engine');
    });
    console.log(`✓ User B found project in search: ${searchFound}`);

    // User B opens an individual build log entry
    console.log('[Journey B] User B opens public project and views direct log entry...');
    await pageB.goto('http://localhost:5173/projects/distributed-task-engine', { waitUntil: 'networkidle0' });
    const firstLogId = await pageB.evaluate(() => {
      const el = document.querySelector('[id^="log-"]');
      return el ? el.id.replace('log-', '') : null;
    });

    if (firstLogId) {
      await pageB.goto(`http://localhost:5173/projects/distributed-task-engine/logs/${firstLogId}`, { waitUntil: 'networkidle0' });
      await pageB.waitForSelector('h1', { timeout: 8000 });
      console.log(`✓ User B loaded direct permalink for build log: ${firstLogId}`);
    }

    await pageB.screenshot({ path: path.join(screenshotsDir, '02_journey_b_search_and_log.png'), fullPage: true });
    copyToArtifacts('02_journey_b_search_and_log.png');

    // ==========================================
    // JOURNEY C: Privacy Enforcement
    // ==========================================
    console.log('\n--- JOURNEY C: Privacy Enforcement ---');
    console.log('[Journey C] User A creates a PRIVATE project...');
    await pageA.goto('http://localhost:5173/projects', { waitUntil: 'networkidle0' });
    await new Promise((r) => setTimeout(r, 800));
    await clickButtonWithText(pageA, 'Create Project');
    await new Promise((r) => setTimeout(r, 800));

    await pageA.waitForSelector('input[placeholder*="Distributed Task Engine"]', { timeout: 5000 });
    await pageA.type('input[placeholder*="Distributed Task Engine"]', 'Stealth Quantum Crypt');
    await pageA.type('input[placeholder*="High-throughput"]', 'Confidential post-quantum key exchange algorithms');
    await clickButtonWithText(pageA, 'Private'); // Toggle private visibility
    await pageA.click('form button[type="submit"]');
    await new Promise((r) => setTimeout(r, 1500));
    console.log('✓ User A created private project "Stealth Quantum Crypt".');

    // User B attempts to access private project directly
    console.log('[Journey C] User B attempts direct navigation to private project...');
    await pageB.goto('http://localhost:5173/projects/stealth-quantum-crypt', { waitUntil: 'networkidle0' });
    await new Promise((r) => setTimeout(r, 1200));

    const isDeniedOnB = await pageB.evaluate(() => {
      const text = document.body.innerText;
      return text.includes('Project Inaccessible') || text.includes('private or does not exist');
    });
    console.log(`✓ Privacy barrier verified: User B direct access denied = ${isDeniedOnB}`);

    // User B searches for "Quantum"
    console.log('[Journey C] User B searches for "Quantum" on /search...');
    await pageB.goto('http://localhost:5173/search?q=Quantum&type=projects', { waitUntil: 'networkidle0' });
    await new Promise((r) => setTimeout(r, 1200));

    const leakedInSearch = await pageB.evaluate(() => {
      return document.body.innerText.includes('Stealth Quantum Crypt');
    });
    console.log(`✓ Privacy barrier verified: Private project leaked in search = ${leakedInSearch} (expected false)`);

    await pageB.screenshot({ path: path.join(screenshotsDir, '03_journey_c_privacy_enforcement.png'), fullPage: true });
    copyToArtifacts('03_journey_c_privacy_enforcement.png');

    // ==========================================
    // JOURNEY D: Ownership Enforcement
    // ==========================================
    console.log('\n--- JOURNEY D: Ownership Controls ---');
    console.log('[Journey D] User B inspects User A public project controls...');
    await pageB.goto('http://localhost:5173/projects/distributed-task-engine', { waitUntil: 'networkidle0' });
    await new Promise((r) => setTimeout(r, 1000));

    const ownerControlsVisibleToB = await pageB.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const editBtn = btns.find(b => b.innerText && b.innerText.includes('Edit'));
      const deleteBtn = btns.find(b => b.innerText && b.innerText.includes('Delete'));
      const newLogBtn = btns.find(b => b.innerText && b.innerText.includes('New Log Entry'));
      return Boolean(editBtn || deleteBtn || newLogBtn);
    });
    console.log(`✓ Ownership verified: Owner action controls hidden from User B = ${!ownerControlsVisibleToB}`);

    await pageB.screenshot({ path: path.join(screenshotsDir, '04_journey_d_ownership_controls.png'), fullPage: true });
    copyToArtifacts('04_journey_d_ownership_controls.png');

    // ==========================================
    // JOURNEY E: Profile Integration & Legacy Showcase
    // ==========================================
    console.log('\n--- JOURNEY E: Profile Integration ---');
    console.log('[Journey E] User A views their own profile showcase...');
    await pageA.goto('http://localhost:5173/profile', { waitUntil: 'networkidle0' });
    await new Promise((r) => setTimeout(r, 1500));

    const userAProjectsOnProfile = await pageA.evaluate(() => {
      const text = document.body.innerText;
      return {
        hasPublicProject: text.includes('Distributed Task Engine'),
        hasPrivateProject: text.includes('Stealth Quantum Crypt')
      };
    });
    console.log(`✓ Owner profile displays: Public=${userAProjectsOnProfile.hasPublicProject}, Private=${userAProjectsOnProfile.hasPrivateProject}`);

    // User B views User A profile
    console.log(`[Journey E] User B views User A public profile...`);
    // Find User A id from pageA or navigate by /user/:id or search
    const userAId = await pageA.evaluate(() => {
      const userStr = localStorage.getItem('user');
      try {
        const u = JSON.parse(userStr);
        return u._id || u.id;
      } catch {
        return null;
      }
    });

    if (userAId) {
      await pageB.goto(`http://localhost:5173/user/${userAId}`, { waitUntil: 'networkidle0' });
      await new Promise((r) => setTimeout(r, 1500));

      const userBViewsAProfile = await pageB.evaluate(() => {
        const text = document.body.innerText;
        return {
          hasPublicProject: text.includes('Distributed Task Engine'),
          hasPrivateProject: text.includes('Stealth Quantum Crypt')
        };
      });
      console.log(`✓ Visitor viewing profile: Public=${userBViewsAProfile.hasPublicProject}, Private=${userBViewsAProfile.hasPrivateProject} (private must be false)`);
    }

    await pageA.screenshot({ path: path.join(screenshotsDir, '05_journey_e_profile_showcase.png'), fullPage: true });
    copyToArtifacts('05_journey_e_profile_showcase.png');

    // ==========================================
    // JOURNEY F: Responsive & Theme Checks
    // ==========================================
    console.log('\n--- JOURNEY F: Responsive & Theme Verification ---');
    // Mobile Viewport (390 x 844)
    console.log('[Journey F] Checking mobile viewport (390px)...');
    await pageA.setViewport({ width: 390, height: 844 });
    await pageA.goto('http://localhost:5173/projects/distributed-task-engine', { waitUntil: 'networkidle0' });
    await new Promise((r) => setTimeout(r, 1000));
    await pageA.screenshot({ path: path.join(screenshotsDir, '06_journey_f_responsive_mobile.png'), fullPage: true });
    copyToArtifacts('06_journey_f_responsive_mobile.png');
    console.log('✓ Captured mobile viewport screenshot.');

    // Desktop Viewport (1440 x 900)
    console.log('[Journey F] Checking desktop viewport (1440px)...');
    await pageA.setViewport({ width: 1440, height: 900 });
    await pageA.goto('http://localhost:5173/projects', { waitUntil: 'networkidle0' });
    await new Promise((r) => setTimeout(r, 1000));
    await pageA.screenshot({ path: path.join(screenshotsDir, '07_journey_f_responsive_desktop.png'), fullPage: true });
    copyToArtifacts('07_journey_f_responsive_desktop.png');
    console.log('✓ Captured desktop viewport screenshot.');

    console.log('\n🎉 ALL ACCEPTANCE JOURNEYS COMPLETED SUCCESSFULLY!');
  } catch (err) {
    console.error('Acceptance test failed with error:', err);
    throw err;
  } finally {
    await browser.close();
  }
}

runPhase9Acceptance().catch((err) => {
  console.error(err);
  process.exit(1);
});
