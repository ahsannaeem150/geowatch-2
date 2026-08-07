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

async function toggleTheme() {
  await page.click('button[title="Settings"]');
  await page.waitForTimeout(900);
  await page.locator('button[title="Switch to light mode"], button[title="Switch to dark mode"]').first().click();
  await page.waitForTimeout(1800);
}

await page.click('button[title="Saved"]');
await page.waitForTimeout(1200);
const theme1 = await page.evaluate(() => document.documentElement.getAttribute('data-theme'));
await page.screenshot({ path: `${SHOTS}/saved-${theme1}.png`, timeout: 10000, animations: 'disabled' });
console.log('shot saved-' + theme1);

await toggleTheme();
await page.click('button[title="Saved"]');
await page.waitForTimeout(1200);
const theme2 = await page.evaluate(() => document.documentElement.getAttribute('data-theme'));
await page.screenshot({ path: `${SHOTS}/saved-${theme2}.png`, timeout: 10000, animations: 'disabled' });
console.log('shot saved-' + theme2);
await browser.close();
