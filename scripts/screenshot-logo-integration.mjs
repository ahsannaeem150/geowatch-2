import { chromium } from 'playwright';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');
const outDir = path.join(rootDir, 'temp_screenshots', 'logo-integration');

const baseUrl = 'http://localhost:5173';

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 1600, height: 1000 } });

async function capture(route, theme, name, { scrollBottom = false } = {}) {
  const page = await context.newPage();
  await page.goto(baseUrl, { waitUntil: 'domcontentloaded' });
  await page.evaluate(
    ({ theme }) => {
      localStorage.setItem('intelmap24-theme', theme);
      sessionStorage.setItem('intelmap24_booted', 'true'); // skip boot overlay
    },
    { theme }
  );
  await page.goto(`${baseUrl}${route}`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1500);
  if (scrollBottom) {
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(800);
  }
  await page.screenshot({ path: path.join(outDir, `${name}-${theme}.png`), fullPage: false });
  console.log(`Captured ${name}-${theme}.png`);
  await page.close();
}

await capture('/', 'dark', 'home-header');
await capture('/', 'light', 'home-header');
await capture('/', 'dark', 'home-footer', { scrollBottom: true });
await capture('/', 'light', 'home-footer', { scrollBottom: true });
await capture('/map', 'dark', 'map-topbar');
await capture('/map', 'light', 'map-topbar');

await browser.close();
console.log('Screenshots saved to', outDir);
