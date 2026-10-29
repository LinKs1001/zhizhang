const fs = require('fs');
const path = require('path');
const { pathToFileURL } = require('url');

const modulePath = process.env.PLAYWRIGHT_CORE_PATH;
const executablePath = process.env.PREVIEW_CHROMIUM;
if (!modulePath) throw new Error('PLAYWRIGHT_CORE_PATH is required');
if (!executablePath) throw new Error('PREVIEW_CHROMIUM is required');

const { chromium } = require(modulePath);
const sourceDir = __dirname;
const previewDir = path.resolve(sourceDir, '..');
const mockupUrl = pathToFileURL(path.join(sourceDir, 'mockups.html')).href;
const overviewUrl = pathToFileURL(path.join(sourceDir, 'overview.html')).href;

async function settle(page) {
  await page.waitForLoadState('networkidle');
  await page.evaluate(async () => {
    if (document.fonts && document.fonts.ready) await document.fonts.ready;
    await Promise.all(Array.from(document.images).map((img) => img.complete ? Promise.resolve() : new Promise((resolve) => {
      img.addEventListener('load', resolve, { once: true });
      img.addEventListener('error', resolve, { once: true });
    })));
  });
  await page.waitForTimeout(150);
}

(async () => {
  const browser = await chromium.launch({
    executablePath,
    headless: true,
    args: ['--allow-file-access-from-files', '--hide-scrollbars']
  });

  const screens = [
    ['home', '01-home.png'],
    ['ai', '02-entry.png'],
    ['analysis', '03-analysis.png'],
    ['login', '04-login-join.png']
  ];

  const mobile = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
    reducedMotion: 'reduce'
  });
  const mobilePage = await mobile.newPage();
  for (const [view, filename] of screens) {
    await mobilePage.goto(`${mockupUrl}?view=${view}`, { waitUntil: 'load' });
    await settle(mobilePage);
    await mobilePage.screenshot({ path: path.join(previewDir, filename), fullPage: false });
    console.log(`[screen] ${filename}`);
  }
  await mobile.close();

  const desktop = await browser.newContext({
    viewport: { width: 1600, height: 1000 },
    deviceScaleFactor: 1,
    reducedMotion: 'reduce'
  });
  const desktopPage = await desktop.newPage();
  await desktopPage.goto(overviewUrl, { waitUntil: 'load' });
  await settle(desktopPage);
  await desktopPage.screenshot({ path: path.join(previewDir, '00-overview.png'), fullPage: false });
  console.log('[overview] 00-overview.png');
  await desktop.close();

  await browser.close();
})().catch((error) => {
  console.error(error);
  process.exit(1);
});

