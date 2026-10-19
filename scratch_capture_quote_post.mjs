import puppeteer from 'puppeteer-core';
import fs from 'fs';
import path from 'path';

const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const screenshotsDir = 'c:/Users/User/Projects/Postify/screenshots/phase4';

async function captureQuotePost() {
  const browser = await puppeteer.launch({
    executablePath: chromePath,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1440, height: 900 });

    // Login as Alice to see the quote post on feed
    await page.goto('http://localhost:5173/feed', { waitUntil: 'networkidle0' });
    await new Promise(r => setTimeout(r, 1000));

    // Scroll down to the first article card
    const firstArticle = await page.$('article');
    if (firstArticle) {
      await page.evaluate(el => el.scrollIntoView({ behavior: 'instant', block: 'center' }), firstArticle);
      await new Promise(r => setTimeout(r, 600));

      // Capture Quote-Post on Feed Desktop Light
      await page.screenshot({
        path: path.join(screenshotsDir, '07_quote_post_card_desktop_light.png'),
        fullPage: false
      });
      console.log('📸 Captured 07_quote_post_card_desktop_light.png');

      // Toggle Dark theme
      const themeBtn = await page.$('button[aria-label="Switch to dark theme"]');
      if (themeBtn) {
        await themeBtn.click();
        await new Promise(r => setTimeout(r, 600));
        await page.screenshot({
          path: path.join(screenshotsDir, '08_quote_post_card_desktop_dark.png'),
          fullPage: false
        });
        console.log('📸 Captured 08_quote_post_card_desktop_dark.png');
      }
    }
  } finally {
    await browser.close();
  }
}

captureQuotePost().catch(console.error);
