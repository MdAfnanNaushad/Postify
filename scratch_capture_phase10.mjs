import puppeteer from 'puppeteer-core';
import fs from 'fs';
import path from 'path';

const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const screenshotsDir = 'c:/Users/User/Projects/Postify/screenshots/phase10';

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

  // 1. Audit LandingPage at all 8 target viewports
  for (const vp of viewports) {
    await page.setViewport({ width: vp.width, height: vp.height });
    await page.goto('http://localhost:5173/', { waitUntil: 'networkidle0' });
    await new Promise(r => setTimeout(r, 600));

    // Check horizontal scroll overflow
    const hasHorizontalOverflow = await page.evaluate(() => {
      return document.documentElement.scrollWidth > window.innerWidth;
    });

    console.log(`LandingPage ${vp.name}: overflow = ${hasHorizontalOverflow}`);

    if (vp.name === '390px' || vp.name === '1440px') {
      await page.screenshot({
        path: path.join(screenshotsDir, `landing_${vp.name}.png`),
        fullPage: false
      });
      // Also full page to inspect middle sections and footer
      await page.screenshot({
        path: path.join(screenshotsDir, `landing_full_${vp.name}.png`),
        fullPage: true
      });
    }
  }

  // 2. Capture /feed page at 390px and 1440px
  for (const vp of [viewports[2], viewports[7]]) {
    await page.setViewport({ width: vp.width, height: vp.height });
    await page.goto('http://localhost:5173/feed', { waitUntil: 'networkidle0' });
    await new Promise(r => setTimeout(r, 600));
    await page.screenshot({
      path: path.join(screenshotsDir, `feed_${vp.name}.png`),
      fullPage: false
    });
  }

  console.log('All Phase 10 screenshots captured successfully in', screenshotsDir);
  await browser.close();
}

capture().catch(err => {
  console.error('Capture error:', err);
  process.exit(1);
});
