import { chromium } from 'playwright';
import { existsSync, mkdirSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const OUT = join(ROOT, 'temp_screenshots', 'trial-light-verify');

if (!existsSync(OUT)) mkdirSync(OUT, { recursive: true });

const ADMIN_BASE = 'http://localhost:5174';
const VIEWPORT = { width: 1440, height: 900 };

async function setTheme(page, theme, style = 'tactical') {
  await page.evaluate(
    ({ theme, style }) => {
      localStorage.setItem('geowatch-theme', theme);
      localStorage.setItem('geowatch-style', style);
    },
    { theme, style }
  );
}

async function screenshot(page, path, wait = 1500) {
  await page.waitForTimeout(wait);
  await page.screenshot({ path });
  console.log('Saved', path);
}

const browser = await chromium.launch();
const context = await browser.newContext({ viewport: VIEWPORT });

for (const theme of ['light', 'dark']) {
  const page = await context.newPage();
  await page.goto(`${ADMIN_BASE}/trial/map-workspace-a`, { waitUntil: 'networkidle' });
  await setTheme(page, theme, 'tactical');
  await page.reload({ waitUntil: 'networkidle' });
  await page.waitForSelector('.maplibregl-canvas', { timeout: 15000 }).catch(() => {});

  // Open Settings drawer
  const settingsBtn = page.locator('button[title="Settings"]').first();
  if (await settingsBtn.count()) {
    await settingsBtn.click();
    await screenshot(page, join(OUT, `settings-drawer-${theme}.png`), 1000);
  }

  await page.close();
}

await browser.close();
console.log('Done');
