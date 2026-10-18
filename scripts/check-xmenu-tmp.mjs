import { chromium } from 'playwright';
const BASE = 'http://localhost:5174';
const INCIDENT_ID = '34d3e7b7-5daa-4d6a-85d3-29a1262780cb';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1600, height: 950 } });
const res = await page.request.post('http://localhost:3100/api/v1/auth/login', {
  data: { email: 'editor@geowatch.local', password: 'EditorPass123!' },
});
const { data } = await res.json();
await page.goto(`${BASE}/login`, { waitUntil: 'domcontentloaded' });
await page.evaluate((t) => localStorage.setItem('intelmap24_token', t), data.token);
await page.goto(`${BASE}/incident/${INCIDENT_ID}`, { waitUntil: 'domcontentloaded' });
await sleep(4000);
await page.locator('.opt1-filter-tab', { hasText: 'Posts' }).first().click();
try { await page.waitForSelector('.id-tw', { timeout: 20000 }); } catch {}
await sleep(2500);
// open the admin ⋯ menu on the first expanded card
const dots = page.locator('.id-x-compact__bar-tools .id-x-iconbtn').first();
console.log('bar icon buttons:', await page.locator('.id-x-compact__bar-tools .id-x-iconbtn').count());
await dots.click();
await sleep(500);
await page.screenshot({ path: 'temp_screenshots/web-xpost-cards/admin-menu.png' });
console.log('menu items:', await page.locator('.id-x-menu button').count());
await page.keyboard.press('Escape');
// collapse all → compact rows
await page.locator('.id-x-compact__collapse', { hasText: 'Collapse all' }).click();
await sleep(800);
await page.screenshot({ path: 'temp_screenshots/web-xpost-cards/collapsed.png' });
console.log('summary rows:', await page.locator('.id-x-compact__summary').count());
await browser.close();
