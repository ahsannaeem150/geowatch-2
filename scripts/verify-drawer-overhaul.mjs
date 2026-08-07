// Drawer overhaul verification — all drawers dark+light, notification click
// navigation test, recents zone-row check, activity backfill row count.
import { chromium } from 'playwright';
const BASE = 'http://localhost:5174';
const STATE = 'temp_screenshots/ui-sweep-admin/auth-state.json';
const SHOTS = 'temp_screenshots/drawer-overhaul';

const DRAWERS = ['Incidents', 'Active', 'Activity', 'Notifications', 'Saved', 'Recents'];

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
async function openDrawer(label) {
  // Clicking the active rail button toggles it closed — reopen if needed
  await page.click(`button[title="${label}"]`);
  await page.waitForTimeout(1100);
}

// ── Dark pass ──
for (const d of DRAWERS) {
  await openDrawer(d);
  await page.screenshot({ path: `${SHOTS}/${d.toLowerCase()}-dark.png`, timeout: 10000, animations: 'disabled' });
  console.log(`shot ${d.toLowerCase()}-dark`, await theme());
}

// Activity backfill check: count rows + first titles
await openDrawer('Activity');
console.log('activity rows:', JSON.stringify(await page.evaluate(() => {
  const tiles = [...document.querySelectorAll('svg.lucide-plus, svg.lucide-refresh-cw, svg.lucide-trash-2, svg.lucide-activity')];
  return { iconTiles: tiles.length };
})));

// Recents zone-row check: hexagon micro-labels
await openDrawer('Recents');
console.log('recents zones:', JSON.stringify(await page.evaluate(() => {
  const hexes = [...document.querySelectorAll('svg.lucide-hexagon')];
  return hexes.map((h) => h.parentElement?.textContent?.trim()).filter(Boolean);
})));

// Notification click test: first row → detail panel should open with its incident
await openDrawer('Notifications');
const notifInfo = await page.evaluate(() => {
  // Row = div whose direct child column holds the delete button
  const rows = [...document.querySelectorAll('div')].filter((d) => d.querySelector(':scope > div > button[title="Delete notification"]'));
  if (rows.length === 0) return { count: 0 };
  const first = rows[0];
  return { count: rows.length, text: (first.textContent || '').slice(0, 60) };
});
console.log('notifications:', JSON.stringify(notifInfo));
if (notifInfo.count > 0) {
  // Delete button → parent column → parent row; click the row body
  const firstRow = page.locator('button[title="Delete notification"]').first().locator('xpath=../..');
  await firstRow.click({ position: { x: 120, y: 12 } });
  await page.waitForTimeout(3000);
  const url = page.url();
  console.log('after notification click, url has incident param:', url.includes('incident='), url.slice(0, 120));
  await page.screenshot({ path: `${SHOTS}/notification-click-dark.png`, timeout: 10000, animations: 'disabled' });
  console.log('shot notification-click-dark');
}

// ── Light pass ──
await toggleTheme();
for (const d of DRAWERS) {
  await openDrawer(d);
  await page.screenshot({ path: `${SHOTS}/${d.toLowerCase()}-light.png`, timeout: 10000, animations: 'disabled' });
  console.log(`shot ${d.toLowerCase()}-light`, await theme());
}

await browser.close();
