import puppeteer from 'puppeteer-core';
import fs from 'fs';
import path from 'path';

const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const screenshotsDir = 'c:/Users/User/Projects/Postify/screenshots/phase9';

if (!fs.existsSync(screenshotsDir)) {
  fs.mkdirSync(screenshotsDir, { recursive: true });
}

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

async function capture() {
  const browser = await puppeteer.launch({
    executablePath: chromePath,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();

  // 1. Capture HomePage across key viewports (390px, 1440px) and check responsive overflow
  for (const vp of viewports) {
    await page.setViewport({ width: vp.width, height: vp.height });
    await page.goto('http://localhost:5173/', { waitUntil: 'networkidle0' });
    await new Promise(r => setTimeout(r, 800));

    // Check horizontal scroll overflow
    const hasHorizontalOverflow = await page.evaluate(() => {
      return document.documentElement.scrollWidth > window.innerWidth;
    });

    console.log(`HomePage ${vp.name}: overflow = ${hasHorizontalOverflow}`);

    if (vp.name === '390px' || vp.name === '1440px') {
      await page.screenshot({
        path: path.join(screenshotsDir, `home_${vp.name}.png`),
        fullPage: false
      });
    }
  }

  // 2. Capture LoginPage at 390px and 1440px
  for (const vp of [viewports[2], viewports[7]]) {
    await page.setViewport({ width: vp.width, height: vp.height });
    await page.goto('http://localhost:5173/login', { waitUntil: 'networkidle0' });
    await new Promise(r => setTimeout(r, 600));
    await page.screenshot({
      path: path.join(screenshotsDir, `login_${vp.name}.png`),
      fullPage: false
    });
  }

  // 3. Capture RegisterPage at 390px and 1440px
  for (const vp of [viewports[2], viewports[7]]) {
    await page.setViewport({ width: vp.width, height: vp.height });
    await page.goto('http://localhost:5173/register', { waitUntil: 'networkidle0' });
    await new Promise(r => setTimeout(r, 600));
    await page.screenshot({
      path: path.join(screenshotsDir, `register_${vp.name}.png`),
      fullPage: false
    });
  }

  // 4. Register a temporary user to view ProfilePage cleanly and capture screenshots
  const testEmail = `viewer_${Date.now()}@postify.com`;
  await page.goto('http://localhost:5173/register', { waitUntil: 'networkidle0' });
  await page.type('input[name="name"]', 'Editorial Critic');
  await page.type('input[name="username"]', `critic_${Date.now()}`);
  await page.type('input[name="email"]', testEmail);
  await page.type('input[name="password"]', 'Password123!');
  await page.click('button[type="submit"]');
  await page.waitForNavigation({ waitUntil: 'networkidle0' }).catch(() => {});
  await new Promise(r => setTimeout(r, 1200));

  for (const vp of [viewports[2], viewports[7]]) {
    await page.setViewport({ width: vp.width, height: vp.height });
    await page.screenshot({
      path: path.join(screenshotsDir, `profile_${vp.name}.png`),
      fullPage: false
    });
  }

  console.log('All screenshots captured successfully in', screenshotsDir);
  await browser.close();
}

capture().catch(err => {
  console.error('Capture error:', err);
  process.exit(1);
});
