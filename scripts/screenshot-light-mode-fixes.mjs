import { chromium } from 'playwright';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');
const outDir = path.join(rootDir, 'temp_screenshots', 'light-mode-glow-fixes');

const baseUrl = 'http://localhost:5173';

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 1600, height: 1000 } });

async function capture(route, theme, name) {
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
  await page.screenshot({ path: path.join(outDir, `${name}-${theme}.png`), fullPage: false });
  console.log(`Captured ${name}-${theme}.png`);
  await page.close();
}

await capture('/map', 'dark', 'map-topbar');
await capture('/map', 'light', 'map-topbar');
await capture('/', 'dark', 'home-hero');
await capture('/', 'light', 'home-hero');

await browser.close();
console.log('Screenshots saved to', outDir);
