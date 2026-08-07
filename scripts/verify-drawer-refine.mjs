// Drawer refinement verification:
//  A) activity per-row seen (clicked row normalizes, others stay highlighted)
//  B) notifications unread treatment + mark-all-as-seen + NO delete buttons
//  C) Hexagon zone glyph on incidents/active/saved rows
import { chromium } from 'playwright';
const BASE = 'http://localhost:5174';
const STATE = 'temp_screenshots/ui-sweep-admin/auth-state.json';
const SHOTS = 'temp_screenshots/drawer-refine';

const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({ storageState: STATE, viewport: { width: 1440, height: 900 } });
// Backdate the lastSeen baseline 4 days so backfilled activity rows render unseen
await ctx.addInitScript(() => {
  localStorage.setItem('geowatch_admin_last_seen', String(Date.now() - 4 * 24 * 3600 * 1000));
});
const page = await ctx.newPage();
page.on('pageerror', (e) => console.log('PAGEERROR:', String(e).slice(0, 200)));
await page.goto(BASE + '/', { waitUntil: 'domcontentloaded' });
await page.waitForSelector('.maplibregl-canvas', { timeout: 25000 });
await page.waitForTimeout(5000);

const theme = () => page.evaluate(() => document.documentElement.getAttribute('data-theme'));
async function openDrawer(label) {
  await page.click(`button[title="${label}"]`);
  await page.waitForTimeout(1300);
}
const unseenCount = () => page.evaluate(() => {
  // unseen activity rows = cards with the accent-subtle background + pulse dot
  return document.querySelectorAll('span[style*="gw-dot-pulse"], span[style*="animation: gw-dot-pulse"]').length
    || [...document.querySelectorAll('div')].filter((d) => d.style.animation?.includes('gw-dot-pulse')).length;
});
const unseenCount2 = () => page.evaluate(() => {
  return [...document.querySelectorAll('span')].filter((s) => (s.getAttribute('style') || '').includes('gw-dot-pulse')).length;
});

// ── A. Activity: unseen → click one → it normalizes ──
await openDrawer('Activity');
const before = await unseenCount2();
console.log('unseen activity rows before click:', before);
await page.screenshot({ path: `${SHOTS}/activity-unseen-dark.png`, timeout: 10000, animations: 'disabled' });
// Click the second activity row (first may open a panel over the drawer edge)
const rows = page.locator('span[style*="gw-dot-pulse"]');
if (await rows.count() > 1) {
  const secondRow = rows.nth(1).locator('xpath=ancestor::div[contains(@style,"cursor")]').first();
  await secondRow.click({ position: { x: 150, y: 10 } });
  await page.waitForTimeout(2500);
  const after = await unseenCount2();
  console.log('unseen activity rows after one click:', after);
  await page.screenshot({ path: `${SHOTS}/activity-clicked-dark.png`, timeout: 10000, animations: 'disabled' });
}

// ── B. Notifications ──
await openDrawer('Notifications');
const notifState = await page.evaluate(() => ({
  deleteButtons: document.querySelectorAll('button[title="Delete notification"]').length,
  markReadButtons: document.querySelectorAll('button[title="Mark read"]').length,
  markAllVisible: [...document.querySelectorAll('button')].some((b) => b.textContent.trim() === 'Mark all as seen'),
}));
console.log('notifications state:', JSON.stringify(notifState));
await page.screenshot({ path: `${SHOTS}/notifications-dark.png`, timeout: 10000, animations: 'disabled' });
// Click the first unread row → should mark read + navigate
const unreadRow = page.locator('div[style*="accent-subtle-bg"]:has(svg.lucide-alert-triangle), div[style*="accent-subtle-bg"]:has(svg.lucide-file-text), div[style*="accent-subtle-bg"]:has(svg.lucide-bell)').first();
if (await unreadRow.count()) {
  await unreadRow.click({ position: { x: 150, y: 12 } });
  await page.waitForTimeout(2500);
  await page.screenshot({ path: `${SHOTS}/notifications-after-click-dark.png`, timeout: 10000, animations: 'disabled' });
  console.log('shot notifications-after-click-dark');
}
// Mark all as seen
const markAllBtn = page.locator('button:has-text("Mark all as seen")');
if (await markAllBtn.count()) {
  await markAllBtn.first().click();
  await page.waitForTimeout(1500);
}
await page.screenshot({ path: `${SHOTS}/notifications-markall-dark.png`, timeout: 10000, animations: 'disabled' });
console.log('shot notifications-markall-dark');

// ── C. Hexagon zone glyph per drawer ──
for (const d of ['Incidents', 'Active', 'Saved']) {
  await openDrawer(d);
  const hex = await page.evaluate(() => document.querySelectorAll('svg.lucide-hexagon').length);
  console.log(`${d} hexagon glyphs:`, hex);
  await page.screenshot({ path: `${SHOTS}/${d.toLowerCase()}-dark.png`, timeout: 10000, animations: 'disabled' });
  console.log(`shot ${d.toLowerCase()}-dark`, await theme());
}

// ── Light pass (spot) ──
await openDrawer('Settings');
await page.locator('button[title="Switch to light mode"], button[title="Switch to dark mode"]').first().click();
await page.waitForTimeout(1800);
await openDrawer('Notifications');
await page.screenshot({ path: `${SHOTS}/notifications-light.png`, timeout: 10000, animations: 'disabled' });
await openDrawer('Active');
await page.screenshot({ path: `${SHOTS}/active-light.png`, timeout: 10000, animations: 'disabled' });
console.log('shot light pass', await theme());

await browser.close();
