import { chromium } from 'playwright';
import fs from 'node:fs';

const OUT = 'temp_screenshots/theme-lab';
const AUTH = 'temp_screenshots/ui-sweep-superadmin/auth-state.json';
fs.mkdirSync(OUT, { recursive: true });

const hasAuth = fs.existsSync(AUTH);
const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({
  ...(hasAuth ? { storageState: AUTH } : {}),
  viewport: { width: 1600, height: 950 },
});
const page = await context.newPage();

await page.goto('http://localhost:5175/superadmin/theme-lab', { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(1500);

// Fresh login if the saved state is stale (rate limit: this runs at most once)
if (page.url().includes('/login')) {
  console.log('auth state stale — logging in');
  await page.fill('input[type="email"]', 'admin@geowatch.local');
  await page.fill('input[type="password"]', 'AdminPass123!');
  await page.click('button[type="submit"]');
  await page.waitForURL('**/superadmin**', { timeout: 15000 });
  await page.goto('http://localhost:5175/superadmin/theme-lab', { waitUntil: 'domcontentloaded' });
  await context.storageState({ path: AUTH });
}

await page.waitForSelector('text=Theme Lab', { timeout: 15000 });
await page.waitForTimeout(800);

// 1) Crimson preset
await page.click('text=Crimson Seal');
await page.waitForTimeout(500);
const crimsonAccent = await page.evaluate(() =>
  getComputedStyle(document.documentElement).getPropertyValue('--accent').trim()
);
await page.screenshot({ path: `${OUT}/1-theme-lab-crimson.png`, fullPage: true });

// 2) Logo Blue preset — whole console should turn blue
await page.click('text=Logo Blue');
await page.waitForTimeout(500);
const blueAccent = await page.evaluate(() =>
  getComputedStyle(document.documentElement).getPropertyValue('--accent').trim()
);
const blueLight = await page.evaluate(() =>
  getComputedStyle(document.documentElement).getPropertyValue('--accent-light').trim()
);
await page.screenshot({ path: `${OUT}/2-theme-lab-logo-blue.png`, fullPage: true });

// 3) user-web with the blue ?tokens= URL
const stored = await page.evaluate(() => sessionStorage.getItem('intelmap24_token_preview'));
const b64 = Buffer.from(stored, 'utf8').toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const userPage = await context.newPage();
await userPage.goto(`http://localhost:5173/?tokens=${b64}`, { waitUntil: 'domcontentloaded' });
await userPage.waitForSelector('#intelmap24-token-preview-badge', { timeout: 15000 });
await userPage.waitForTimeout(7000); // home hero entrance (framer-motion) is slow in headless
const userAccent = await userPage.evaluate(() =>
  getComputedStyle(document.documentElement).getPropertyValue('--accent').trim()
);
const urlAfterStrip = userPage.url();
await userPage.screenshot({ path: `${OUT}/3-user-web-blue-preview.png` });

console.log(JSON.stringify({ crimsonAccent, blueAccent, blueLight, userAccent, urlAfterStrip }, null, 1));
await browser.close();
