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
try { await page.waitForSelector('.id-x-archive__img-btn, .id-x-compact__summary', { timeout: 20000 }); } catch {}
await sleep(2000);
console.log('archive notice:', await page.locator('.id-x-archive-notice').count());
console.log('archived img buttons:', await page.locator('.id-x-archive__img-btn').count());
console.log('archived iconrow buttons:', await page.locator('.id-x-iconrow .id-x-iconbtn').count());
const img = page.locator('.id-x-archive__img-btn img').first();
console.log('snapshot img src:', await img.getAttribute('src').catch(() => null));
// scroll archived card into view + screenshot
const card = page.locator('.id-x-compact__item', { has: page.locator('.id-x-archive__img-btn') }).first();
await card.scrollIntoViewIfNeeded();
await sleep(400);
await page.screenshot({ path: 'temp_screenshots/web-xpost-cards/archived-card.png' });
// open snapshot lightbox
await page.locator('.id-x-archive__img-btn').first().click();
await sleep(800);
await page.screenshot({ path: 'temp_screenshots/web-xpost-cards/archived-lightbox.png' });
console.log('lightbox notice:', await page.locator('.id-x-lightbox__notice').count());
await browser.close();
