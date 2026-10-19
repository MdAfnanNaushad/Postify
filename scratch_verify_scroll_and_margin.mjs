import puppeteer from 'puppeteer-core';
import path from 'path';

const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const screenshotsDir = 'c:/Users/User/Projects/Postify/screenshots/phase11';

async function test() {
  const browser = await puppeteer.launch({
    executablePath: chromePath,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();

  const testViewports = [
    { width: 1440, height: 900, name: '1440x900' },
    { width: 1280, height: 800, name: '1280x800' },
    { width: 1024, height: 768, name: '1024x768' },
    { width: 390, height: 844, name: '390x844_mobile' }
  ];

  console.log('=== AUDITING REGISTER PAGE SCROLLABILITY & TOP MARGIN ===');
  for (const vp of testViewports) {
    await page.setViewport({ width: vp.width, height: vp.height });
    await page.goto('http://localhost:5173/register', { waitUntil: 'networkidle0' });
    await new Promise(r => setTimeout(r, 400));

    const metrics = await page.evaluate(() => {
      const doc = document.documentElement;
      const body = document.body;
      const isVerticallyScrollable = doc.scrollHeight > window.innerHeight;
      const isHorizontallyScrollable = doc.scrollWidth > window.innerWidth;
      const scrollbarWidth = window.innerWidth - doc.clientWidth;
      const outerWrapper = document.querySelector('div.w-full.min-h-screen');
      const outerComputed = outerWrapper ? window.getComputedStyle(outerWrapper) : null;

      return {
        isVerticallyScrollable,
        isHorizontallyScrollable,
        docScrollHeight: doc.scrollHeight,
        windowHeight: window.innerHeight,
        scrollbarWidth,
        outerPaddingTop: outerComputed ? outerComputed.paddingTop : null
      };
    });

    console.log(`Register [${vp.name}]:`, metrics);

    if (vp.name === '1440x900' || vp.name === '390x844_mobile') {
      await page.screenshot({
        path: path.join(screenshotsDir, `register_fixed_${vp.name}.png`),
        fullPage: false
      });
    }
  }

  console.log('=== AUDITING LOGIN PAGE SCROLLABILITY & TOP MARGIN ===');
  for (const vp of testViewports) {
    await page.setViewport({ width: vp.width, height: vp.height });
    await page.goto('http://localhost:5173/login', { waitUntil: 'networkidle0' });
    await new Promise(r => setTimeout(r, 400));

    const metrics = await page.evaluate(() => {
      const doc = document.documentElement;
      const isVerticallyScrollable = doc.scrollHeight > window.innerHeight;
      const scrollbarWidth = window.innerWidth - doc.clientWidth;

      return {
        isVerticallyScrollable,
        docScrollHeight: doc.scrollHeight,
        windowHeight: window.innerHeight,
        scrollbarWidth
      };
    });

    console.log(`Login [${vp.name}]:`, metrics);

    if (vp.name === '1440x900' || vp.name === '390x844_mobile') {
      await page.screenshot({
        path: path.join(screenshotsDir, `login_fixed_${vp.name}.png`),
        fullPage: false
      });
    }
  }

  console.log('=== AUDITING GLOBAL SCROLLBAR REMOVAL ON LANDING PAGE ===');
  await page.setViewport({ width: 1440, height: 900 });
  await page.goto('http://localhost:5173/', { waitUntil: 'networkidle0' });
  const scrollbarTest = await page.evaluate(() => {
    const doc = document.documentElement;
    const body = document.body;
    return {
      docScrollbarWidth: window.innerWidth - doc.clientWidth,
      htmlScrollbarWidthStyle: window.getComputedStyle(doc).scrollbarWidth,
      bodyScrollbarWidthStyle: window.getComputedStyle(body).scrollbarWidth
    };
  });
  console.log('Scrollbar test on landing page:', scrollbarTest);

  await page.screenshot({
    path: path.join(screenshotsDir, 'landing_no_scrollbar_1440px.png'),
    fullPage: false
  });

  await browser.close();
  console.log('Audit completed successfully!');
}

test().catch(err => {
  console.error(err);
  process.exit(1);
});
