import fs from 'node:fs';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';

process.loadEnvFile?.('.env.local');
const require = createRequire(import.meta.url);
const modulePath = process.env.PLAYWRIGHT_CORE_PATH;
const executablePath = process.env.PREVIEW_CHROMIUM;
if (!modulePath || !executablePath) throw new Error('Set PLAYWRIGHT_CORE_PATH and PREVIEW_CHROMIUM');
const { chromium } = require(modulePath);
const base = process.env.APP_URL || 'http://localhost:3000';
const setupToken = process.env.SETUP_TOKEN;
if (!setupToken) throw new Error('SETUP_TOKEN missing');

const browser = await chromium.launch({ executablePath, headless: true, args: ['--no-sandbox'] });
const errors = [];
try {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await context.newPage();
  page.on('pageerror', (error) => errors.push(`pageerror: ${error.message}`));
  page.on('response', (response) => {
    if (response.status() >= 500) errors.push(`http ${response.status()}: ${response.url()}`);
  });

  await page.goto(`${base}/setup`, { waitUntil: 'networkidle' });
  if (!page.url().endsWith('/setup')) {
    console.log('Setup already complete; skipping fresh setup path.');
  } else {
    await page.locator('input[placeholder="服务器环境变量中的 SETUP_TOKEN"]').fill(setupToken);
    await page.locator('input[placeholder="3–24 位字母、数字或下划线"]').fill('smoke_owner');
    await page.locator('input[placeholder="例如：小满"]').fill('小满');
    await page.locator('input[placeholder="至少 8 位"]').fill('smoke-password-123');
    await page.getByRole('button', { name: /创建家庭账本/ }).click();
    await page.waitForURL(`${base}/`, { timeout: 20_000 });
    console.log('setup ok');
  }

  await page.goto(`${base}/add`, { waitUntil: 'networkidle' });
  await page.locator('.prompt-card textarea').fill('昨天盒马买菜128.5，微信付的');
  await page.getByRole('button', { name: '识别', exact: true }).click();
  await page.waitForFunction(() => (document.querySelector('.amount-input input'))?.value === '128.5', null, { timeout: 10_000 });
  console.log('parse ok');
  await page.getByRole('button', { name: /确认入账/ }).click();
  await page.waitForURL(`${base}/`, { timeout: 20_000 });
  await page.getByText('盒马买菜128.5').first().waitFor({ timeout: 10_000 }).catch(() => {});
  console.log('save ok');

  await page.goto(`${base}/analysis`, { waitUntil: 'networkidle' });
  await page.getByRole('heading', { name: '分析月报' }).waitFor();
  console.log('analysis ok');

  await page.goto(`${base}/settings`, { waitUntil: 'networkidle' });
  await page.getByRole('button', { name: /生成链接/ }).click();
  await page.locator('.invite-result code').waitFor({ timeout: 10_000 });
  const inviteHref = await page.locator('.invite-result code').textContent();
  const code = inviteHref?.trim().split('/').pop();
  if (!code) throw new Error('invite code missing');
  console.log('invite generated');

  const partnerContext = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const partner = await partnerContext.newPage();
  await partner.goto(`${base}/join/${code}`, { waitUntil: 'networkidle' });
  await partner.locator('input[placeholder="3–24 位字母、数字或下划线"]').fill('smoke_partner');
  await partner.locator('input[placeholder="例如：阿树"]').fill('阿树');
  await partner.locator('input[placeholder="至少 8 位"]').fill('partner-password-123');
  await partner.getByRole('button', { name: /加入家庭账本/ }).click();
  await partner.waitForURL(`${base}/`, { timeout: 20_000 });
  await partner.getByText('盒马买菜128.5').first().waitFor({ timeout: 10_000 });
  console.log('partner join and shared record ok');

  const health = await page.request.get(`${base}/api/health`);
  if (!health.ok()) throw new Error(`health ${health.status()}`);
  await page.screenshot({ path: 'docs/screenshots/app-home.png', fullPage: false });
  await page.goto(`${base}/analysis`, { waitUntil: 'networkidle' });
  await page.screenshot({ path: 'docs/screenshots/app-analysis.png', fullPage: false });
  console.log('e2e smoke passed');
} finally {
  await browser.close();
  if (errors.length) {
    console.error(errors.join('\n'));
    process.exitCode = 1;
  }
}

