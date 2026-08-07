// Drawer redesign v3 screenshots + fixed-x proof for 24H+ (footer-left).
import { chromium } from 'playwright';
const BASE = 'http://localhost:5174';
const STATE = 'temp_screenshots/ui-sweep-admin/auth-state.json';
const SHOTS = 'temp_screenshots/drawer-redesign-v3';

const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({ storageState: STATE, viewport: { width: 1440, height: 900 } });
const page = await ctx.newPage();
page.on('pageerror', (e) => console.log('PAGEERROR:', String(e).slice(0, 200)));
await page.goto(BASE + '/', { waitUntil: 'domcontentloaded' });
await page.waitForSelector('.maplibregl-canvas', { timeout: 25000 });
await page.waitForTimeout(5000);

const theme = () => page.evaluate(() => document.documentElement.getAttribute('data-theme'));
async function toggleTheme() {
  await page.click('button[title="Settings"]');
  await page.waitForTimeout(900);
  await page.locator('button[title="Switch to light mode"], button[title="Switch to dark mode"]').first().click();
  await page.waitForTimeout(1800);
}

// Measure: 24H+ left-x across cards, chip presence, location ellipsis
async function measure() {
  return page.evaluate(() => {
    const flags = [...document.querySelectorAll('span[title="Active for more than 24 hours"]')].map((s) => Math.round(s.getBoundingClientRect().x));
    const chips = [...document.querySelectorAll('span')]
      .filter((s) => s.style.borderRadius === '999px' && s.style.background.includes('color-mix'))
      .slice(0, 6)
      .map((s) => ({ chip: s.textContent.slice(0, 28), x: Math.round(s.getBoundingClientRect().x), w: Math.round(s.getBoundingClientRect().width), clipped: s.scrollWidth > s.clientWidth + 1 }));
    const locs = [...document.querySelectorAll('div')]
      .filter((d) => d.querySelector('svg') && d.style.whiteSpace === 'nowrap' && d.style.overflow === 'hidden')
      .slice(0, 6)
      .map((d) => ({ loc: d.textContent.slice(0, 40), ellipsized: d.scrollWidth > d.clientWidth + 1 }));
    return { flagXs: flags, chips, locs };
  });
}

// 1. Active — dark
await page.click('button[title="Active"]');
await page.waitForTimeout(1200);
console.log('active (dark):', JSON.stringify(await measure()));
await page.screenshot({ path: `${SHOTS}/active-dark.png`, timeout: 10000, animations: 'disabled' });
console.log('shot active-dark', await theme());

// 2. Active — light
await toggleTheme();
await page.click('button[title="Active"]');
await page.waitForTimeout(1200);
console.log('active (light):', JSON.stringify(await measure()));
await page.screenshot({ path: `${SHOTS}/active-light.png`, timeout: 10000, animations: 'disabled' });
console.log('shot active-light', await theme());

// 3. Saved — light
await page.click('button[title="Saved"]');
await page.waitForTimeout(1200);
console.log('saved (light):', JSON.stringify(await measure()));
await page.screenshot({ path: `${SHOTS}/saved-light.png`, timeout: 10000, animations: 'disabled' });
console.log('shot saved-light', await theme());

// 4. Saved — dark
await toggleTheme();
await page.click('button[title="Saved"]');
await page.waitForTimeout(1200);
await page.screenshot({ path: `${SHOTS}/saved-dark.png`, timeout: 10000, animations: 'disabled' });
console.log('shot saved-dark', await theme());

await browser.close();
