import { chromium } from 'playwright';
import { existsSync, mkdirSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const OUT = join(ROOT, 'temp_screenshots', 'verify-theme');

if (!existsSync(OUT)) mkdirSync(OUT, { recursive: true });

const USER_BASE = 'http://localhost:5173';
const VIEWPORT = { width: 1440, height: 900 };

async function setTheme(page, theme) {
  await page.evaluate((t) => {
    localStorage.setItem('geowatch-theme', t);
  }, theme);
}

async function screenshot(page, name) {
  await page.waitForTimeout(1500);
  await page.screenshot({ path: join(OUT, name) });
  console.log('Saved', join(OUT, name));
}

async function scrollToSelector(page, selector) {
  await page.evaluate((sel) => {
    const el = document.querySelector(sel);
    if (el) el.scrollIntoView({ block: 'start' });
  }, selector);
}

async function captureTheme(page, theme) {
  await setTheme(page, theme);
  await page.reload({ waitUntil: 'networkidle' });

  await page.evaluate(() => window.scrollTo(0, 0));
  await screenshot(page, `home-${theme}-hero.png`);

  await scrollToSelector(page, '.home-stats');
  await screenshot(page, `home-${theme}-stats.png`);

  await scrollToSelector(page, '.home-categories');
  await screenshot(page, `home-${theme}-categories.png`);

  await scrollToSelector(page, '.home-events');
  await screenshot(page, `home-${theme}-events.png`);
}

async function main() {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: VIEWPORT });

  page.on('console', (msg) => {
    if (msg.type() === 'error') console.log(`[${msg.type()}]`, msg.text());
  });
  page.on('pageerror', (err) => console.error('[page error]', err.message));

  await page.goto(USER_BASE, { waitUntil: 'networkidle' });

  await captureTheme(page, 'dark');
  await captureTheme(page, 'light');

  await browser.close();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
