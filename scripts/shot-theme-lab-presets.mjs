import { chromium } from 'playwright';
import fs from 'node:fs';

const OUT = 'temp_screenshots/theme-lab';
const AUTH = 'temp_screenshots/ui-sweep-superadmin/auth-state.json';
fs.mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({
  ...(fs.existsSync(AUTH) ? { storageState: AUTH } : {}),
  viewport: { width: 1600, height: 950 },
});
const page = await context.newPage();
await page.goto('http://localhost:5175/superadmin/theme-lab', { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(1500);
if (page.url().includes('/login')) {
  await page.fill('input[type="email"]', 'admin@geowatch.local');
  await page.fill('input[type="password"]', 'AdminPass123!');
  await page.click('button[type="submit"]');
  await page.waitForURL('**/superadmin**', { timeout: 15000 });
  await page.goto('http://localhost:5175/superadmin/theme-lab', { waitUntil: 'domcontentloaded' });
  await context.storageState({ path: AUTH });
}
await page.waitForSelector('text=Theme Lab', { timeout: 15000 });
await page.waitForTimeout(800);

await page.locator('.console-card', { hasText: 'Presets — loads into both themes' })
  .screenshot({ path: `${OUT}/4-preset-row.png` });

await page.click('text=Mint Slate');
await page.waitForTimeout(600);
const mint = await page.evaluate(() => ({
  accent: getComputedStyle(document.documentElement).getPropertyValue('--accent').trim(),
  light: getComputedStyle(document.documentElement).getPropertyValue('--accent-light').trim(),
}));
await page.screenshot({ path: `${OUT}/5-preset-mint-slate.png`, fullPage: true });
console.log(JSON.stringify(mint));
await browser.close();
