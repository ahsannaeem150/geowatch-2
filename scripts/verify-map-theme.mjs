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
  await page.waitForTimeout(2000);
  await page.screenshot({ path: join(OUT, name) });
  console.log('Saved', join(OUT, name));
}

async function main() {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: VIEWPORT });

  page.on('console', (msg) => {
    if (msg.type() === 'error') console.log(`[${msg.type()}]`, msg.text());
  });
  page.on('pageerror', (err) => console.error('[page error]', err.message));

  await page.goto(`${USER_BASE}/map`, { waitUntil: 'networkidle' });

  await setTheme(page, 'light');
  await page.reload({ waitUntil: 'networkidle' });
  await screenshot(page, 'map-light-shell.png');

  await setTheme(page, 'dark');
  await page.reload({ waitUntil: 'networkidle' });
  await screenshot(page, 'map-dark-shell.png');

  await browser.close();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
