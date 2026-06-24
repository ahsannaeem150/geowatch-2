import { chromium } from 'playwright';
import { existsSync, mkdirSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const OUT = join(ROOT, 'temp_screenshots', 'verify-theme');

if (!existsSync(OUT)) mkdirSync(OUT, { recursive: true });

const BASE = 'http://localhost:5173';
const VIEWPORT = { width: 1440, height: 900 };
const ZONE_ID = 'c25ec8cd-e9b9-4880-8c6c-67f999b02e06';

async function setTheme(page, theme) {
  await page.evaluate((t) => {
    localStorage.setItem('geowatch-theme', t);
  }, theme);
}

async function screenshot(page, name) {
  await page.waitForTimeout(3000);
  await page.screenshot({ path: join(OUT, name) });
  console.log('Saved', join(OUT, name));
}

async function main() {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: VIEWPORT });

  page.on('console', (msg) => {
    if (msg.type() === 'error') console.log(`[${msg.type()}]`, msg.text());
  });

  await page.goto(`${BASE}/zone/${ZONE_ID}`, { waitUntil: 'networkidle' });
  await setTheme(page, 'light');
  await page.reload({ waitUntil: 'networkidle' });
  await screenshot(page, 'zone-fullpage-light.png');

  await setTheme(page, 'dark');
  await page.reload({ waitUntil: 'networkidle' });
  await screenshot(page, 'zone-fullpage-dark.png');

  // Also capture a wide viewport to test polygon clipping
  await page.setViewportSize({ width: 1920, height: 700 });
  await page.reload({ waitUntil: 'networkidle' });
  await screenshot(page, 'zone-fullpage-dark-wide.png');
  await setTheme(page, 'light');
  await page.reload({ waitUntil: 'networkidle' });
  await screenshot(page, 'zone-fullpage-light-wide.png');

  await browser.close();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
