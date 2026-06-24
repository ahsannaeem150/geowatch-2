import { chromium } from 'playwright';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const OUT = join(ROOT, 'screenshots', 'showcase-feature-captures');
const USER_BASE = 'http://localhost:5173';
const VIEWPORT = { width: 1920, height: 1080 };

async function setTheme(page, theme = 'dark', style = 'tactical') {
  await page.evaluate(
    ({ theme, style }) => {
      localStorage.setItem('geowatch-theme', theme);
      localStorage.setItem('geowatch-style', style);
    },
    { theme, style }
  );
}

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: VIEWPORT });
  await page.goto(`${USER_BASE}/map`);
  await setTheme(page, 'dark', 'tactical');
  await page.reload({ waitUntil: 'networkidle' });
  await page.waitForSelector('.maplibregl-canvas', { timeout: 20000 }).catch(() => {});
  await page.waitForTimeout(2500);

  // Click at approximate screen coordinates of the From date trigger
  await page.mouse.click(635, 102);
  await page.waitForTimeout(1000);
  await page.screenshot({ path: join(OUT, 'map', 'map-date-picker-open.png') });
  console.log('Saved', join(OUT, 'map', 'map-date-picker-open.png'));

  await browser.close();
})();
