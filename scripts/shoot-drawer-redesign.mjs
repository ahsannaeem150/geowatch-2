// Drawer redesign screenshots for owner review (admin-web).
import { chromium } from 'playwright';
const BASE = 'http://localhost:5174';
const STATE = 'temp_screenshots/ui-sweep-admin/auth-state.json';
const SHOTS = 'temp_screenshots/drawer-redesign';

const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({ storageState: STATE, viewport: { width: 1440, height: 900 } });
const page = await ctx.newPage();
page.on('pageerror', (e) => console.log('PAGEERROR:', String(e).slice(0, 200)));
await page.goto(BASE + '/', { waitUntil: 'domcontentloaded' });
await page.waitForSelector('.maplibregl-canvas', { timeout: 25000 });
await page.waitForTimeout(5000);

// Discover rail button titles
const railTitles = await page.evaluate(() =>
  [...document.querySelectorAll('button[title]')].map((b) => b.title).filter(Boolean)
);
console.log('rail buttons:', JSON.stringify(railTitles));

const theme = () => page.evaluate(() => document.documentElement.getAttribute('data-theme'));

async function openDrawer(name) {
  await page.click(`button[title="${name}"]`);
  await page.waitForTimeout(900);
}
async function toggleTheme() {
  await openDrawer('Settings');
  await page.locator('button[title="Switch to light mode"], button[title="Switch to dark mode"]').first().click();
  await page.waitForTimeout(1800);
}

// 1. Active drawer — dark
await openDrawer('Active');
await page.screenshot({ path: `${SHOTS}/active-dark.png`, timeout: 10000, animations: 'disabled' });
console.log('shot active-dark', await theme());

// 2. Active drawer — light
await toggleTheme();
await openDrawer('Active');
await page.screenshot({ path: `${SHOTS}/active-light.png`, timeout: 10000, animations: 'disabled' });
console.log('shot active-light', await theme());

// 3. Saved drawer — light (already light)
await openDrawer('Saved');
await page.screenshot({ path: `${SHOTS}/saved-light.png`, timeout: 10000, animations: 'disabled' });
console.log('shot saved-light', await theme());

// 4. Saved drawer — dark
await toggleTheme();
await openDrawer('Saved');
await page.screenshot({ path: `${SHOTS}/saved-dark.png`, timeout: 10000, animations: 'disabled' });
console.log('shot saved-dark', await theme());

// 5. Close-up: Active drawer, find row whose meta line ellipsizes (scrollWidth > clientWidth)
await openDrawer('Active');
await page.waitForTimeout(600);
const metaInfo = await page.evaluate(() => {
  const rows = [...document.querySelectorAll('div')].filter((d) =>
    d.style.whiteSpace === 'nowrap' && d.style.overflow === 'hidden' && d.textContent.includes('·'));
  return rows.slice(0, 12).map((d) => {
    const r = d.getBoundingClientRect();
    return { text: d.textContent.slice(0, 80), ellipsized: d.scrollWidth > d.clientWidth + 1, x: r.x, y: r.y, w: r.width, h: r.height, sw: d.scrollWidth, cw: d.clientWidth };
  });
});
console.log('meta lines:', JSON.stringify(metaInfo, null, 1));
const ell = metaInfo.find((m) => m.ellipsized) || metaInfo[0];
if (ell) {
  // clip the meta line region with a little context
  await page.screenshot({
    path: `${SHOTS}/meta-nowrap-closeup.png`,
    timeout: 10000,
    animations: 'disabled',
    clip: { x: Math.max(ell.x - 16, 0), y: Math.max(ell.y - 60, 0), width: Math.min(ell.w + 32, 700), height: ell.h + 80 },
  });
  console.log('shot meta-nowrap-closeup, ellipsized =', ell.ellipsized);
}
await browser.close();
