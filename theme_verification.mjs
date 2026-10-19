import puppeteer from 'puppeteer-core';
import path from 'path';
import fs from 'fs';

const ARTIFACT_DIR = 'C:/Users/User/.gemini/antigravity-ide/brain/93d751f1-1cf8-41cb-b98a-8d48a7d3a43b';
const CHROME_PATH = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const BASE_URL = 'http://localhost:5173';

const VIEWPORTS = [
  { name: 'desktop_1440', width: 1440, height: 900 },
  { name: 'tablet_768', width: 768, height: 1024 },
  { name: 'mobile_390', width: 390, height: 844 },
  { name: 'mobile_320', width: 320, height: 600 }
];

const ROUTES = [
  { path: '/', name: 'landing' },
  { path: '/feed', name: 'feed' },
  { path: '/login', name: 'login' },
  { path: '/register', name: 'register' }
];

async function runVerification() {
  console.log('Launching browser...');
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu']
  });

  const page = await browser.newPage();

  // Test 1: Desktop Screenshots in Light and Dark mode
  for (const route of ROUTES) {
    console.log(`Processing route: ${route.path}`);
    await page.setViewport({ width: 1440, height: 900 });
    await page.goto(`${BASE_URL}${route.path}`, { waitUntil: 'networkidle2' });

    // Scroll to bottom and back to trigger any whileInView Framer Motion components
    if (route.name === 'landing' || route.name === 'feed') {
      await page.evaluate(async () => {
        const totalHeight = Math.max(document.body.scrollHeight, document.documentElement.scrollHeight);
        for (let i = 0; i <= totalHeight; i += 300) {
          window.scrollTo(0, i);
          await new Promise(r => setTimeout(r, 40));
        }
        window.scrollTo(0, 0);
      });
      await new Promise(r => setTimeout(r, 600));
    }

    // Ensure Light mode
    await page.evaluate(() => {
      localStorage.setItem('postify-theme', 'light');
      document.documentElement.classList.remove('dark');
      document.documentElement.removeAttribute('data-theme');
    });
    await new Promise(r => setTimeout(r, 600));

    const lightShot = path.join(ARTIFACT_DIR, `${route.name}_desktop_light.png`);
    await page.screenshot({ path: lightShot, fullPage: route.name !== 'login' && route.name !== 'register' });
    console.log(`Saved: ${lightShot}`);

    // Switch to Dark mode
    await page.evaluate(() => {
      localStorage.setItem('postify-theme', 'dark');
      document.documentElement.classList.add('dark');
      document.documentElement.setAttribute('data-theme', 'dark');
    });
    await new Promise(r => setTimeout(r, 600));

    if (route.name === 'landing' || route.name === 'feed') {
      await page.evaluate(async () => {
        const totalHeight = Math.max(document.body.scrollHeight, document.documentElement.scrollHeight);
        for (let i = 0; i <= totalHeight; i += 300) {
          window.scrollTo(0, i);
          await new Promise(r => setTimeout(r, 40));
        }
        window.scrollTo(0, 0);
      });
      await new Promise(r => setTimeout(r, 800));
    }

    const darkShot = path.join(ARTIFACT_DIR, `${route.name}_desktop_dark.png`);
    await page.screenshot({ path: darkShot, fullPage: route.name !== 'login' && route.name !== 'register' });
    console.log(`Saved: ${darkShot}`);
  }

  // Test 2: Multi-viewport Responsive Checks (Mobile 390px, Tablet 768px, Small Mobile 320px) in Dark Mode
  for (const vp of VIEWPORTS.slice(1)) {
    console.log(`Testing viewport ${vp.name}...`);
    await page.setViewport({ width: vp.width, height: vp.height });
    await page.goto(`${BASE_URL}/`, { waitUntil: 'networkidle2' });

    await page.evaluate(() => {
      document.documentElement.classList.add('dark');
      document.documentElement.setAttribute('data-theme', 'dark');
    });
    await new Promise(r => setTimeout(r, 500));

    const shotPath = path.join(ARTIFACT_DIR, `landing_${vp.name}_dark.png`);
    await page.screenshot({ path: shotPath, fullPage: false });
    console.log(`Saved: ${shotPath}`);
  }

  // Test 3: Interactive Theme Toggle click on navigation
  console.log('Testing interactive theme toggle button on navigation...');
  await page.setViewport({ width: 1440, height: 900 });
  await page.goto(`${BASE_URL}/`, { waitUntil: 'networkidle2' });

  // Locate the toggle button and click it to open menu
  const toggleBtn = await page.$('button[aria-label^="Current theme"]');
  if (toggleBtn) {
    console.log('Found theme toggle button!');
    await toggleBtn.click();
    await new Promise(r => setTimeout(r, 400));
    const dropdownShot = path.join(ARTIFACT_DIR, 'nav_theme_dropdown.png');
    await page.screenshot({ path: dropdownShot, fullPage: false });
    console.log(`Saved theme toggle dropdown: ${dropdownShot}`);
  }

  await browser.close();
  console.log('Verification completed successfully!');
}

runVerification().catch(err => {
  console.error('Error during verification:', err);
  process.exit(1);
});
