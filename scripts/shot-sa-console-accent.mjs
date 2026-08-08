import { chromium } from 'playwright';
import fs from 'node:fs';

const OUT = 'temp_screenshots/sa-console-accent';
const AUTH = 'temp_screenshots/ui-sweep-superadmin/auth-state.json';
fs.mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({
  ...(fs.existsSync(AUTH) ? { storageState: AUTH } : {}),
  viewport: { width: 1600, height: 950 },
});
const page = await context.newPage();
await page.goto('http://localhost:5175/superadmin', { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(1500);
if (page.url().includes('/login')) {
  await page.fill('input[type="email"]', 'admin@geowatch.local');
  await page.fill('input[type="password"]', 'AdminPass123!');
  await page.click('button[type="submit"]');
  await page.waitForURL('**/superadmin**', { timeout: 15000 });
  await context.storageState({ path: AUTH });
  await page.goto('http://localhost:5175/superadmin', { waitUntil: 'domcontentloaded' });
}
await page.waitForSelector('text=Platform overview', { timeout: 15000 });
await page.waitForTimeout(1200);
await page.screenshot({ path: `${OUT}/1-dashboard.png` });

await page.goto('http://localhost:5175/superadmin/users', { waitUntil: 'domcontentloaded' });
await page.waitForSelector('text=Manage platform users', { timeout: 15000 });
await page.waitForTimeout(1200);
await page.screenshot({ path: `${OUT}/2-users.png` });
console.log('shots done');
await browser.close();
