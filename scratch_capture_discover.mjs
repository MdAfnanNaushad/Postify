import puppeteer from 'puppeteer-core';
import path from 'path';

const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const screenshotsDir = 'c:/Users/User/Projects/Postify/screenshots/phase11';

async function capture() {
  const browser = await puppeteer.launch({
    executablePath: chromePath,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();

  const viewports = [
    { width: 1440, height: 900, name: '1440px_desktop' },
    { width: 1280, height: 800, name: '1280px_laptop' },
    { width: 1024, height: 768, name: '1024px_tablet_land' },
    { width: 768, height: 1024, name: '768px_tablet_port' },
    { width: 390, height: 844, name: '390px_mobile' }
  ];

  for (const vp of viewports) {
    await page.setViewport({ width: vp.width, height: vp.height });
    await page.goto('http://localhost:5173/', { waitUntil: 'networkidle0' });

    // Scroll slightly down to trigger whileInView animations
    await page.evaluate(() => window.scrollTo({ top: 500, behavior: 'instant' }));
    await new Promise(r => setTimeout(r, 600));

    // Screenshot the Product Experience (discover) section
    const sectionC = await page.$('section.portal-container.max-w-5xl');
    if (sectionC) {
      await sectionC.screenshot({
        path: path.join(screenshotsDir, `discover_balanced_${vp.name}.png`)
      });
      console.log(`Captured discover section at ${vp.name}`);
    }
  }

  // Also capture full page on desktop
  await page.setViewport({ width: 1440, height: 900 });
  await page.goto('http://localhost:5173/', { waitUntil: 'networkidle0' });
  await page.evaluate(() => window.scrollTo({ top: 600, behavior: 'instant' }));
  await new Promise(r => setTimeout(r, 600));
  await page.screenshot({
    path: path.join(screenshotsDir, `landing_full_discover_pop_1440px.png`),
    fullPage: false
  });

  await browser.close();
  console.log('Capture complete!');
}

capture().catch(err => {
  console.error(err);
  process.exit(1);
});
