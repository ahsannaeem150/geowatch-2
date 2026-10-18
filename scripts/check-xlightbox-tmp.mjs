import { chromium } from 'playwright';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1600, height: 950 } });
const res = await page.request.post('http://localhost:3100/api/v1/auth/login', {
  data: { email: 'editor@geowatch.local', password: 'EditorPass123!' },
});
const { data } = await res.json();
await page.goto('http://localhost:5174/login', { waitUntil: 'domcontentloaded' });
await page.evaluate((t) => localStorage.setItem('intelmap24_token', t), data.token);
await page.goto('http://localhost:5174/incident/34d3e7b7-5daa-4d6a-85d3-29a1262780cb', { waitUntil: 'domcontentloaded' });
await sleep(4500);
await page.locator('.opt1-filter-tab', { hasText: 'Posts' }).first().click().catch(() => {});
await sleep(2500);
const btn = page.locator('.id-x-archive__img-btn').first();
console.log('archived img found:', await btn.count());
if (await btn.count()) {
  await btn.scrollIntoViewIfNeeded(); await sleep(300); await btn.click(); await sleep(700);
  const info = await page.evaluate(() => {
    const el = document.querySelector('.id-x-lightbox');
    if (!el) return null;
    const r = el.getBoundingClientRect();
    return { parentIsBody: el.parentElement === document.body, w: Math.round(r.width), h: Math.round(r.height), vw: innerWidth, vh: innerHeight };
  });
  console.log('lightbox:', JSON.stringify(info));
  await page.screenshot({ path: 'temp_screenshots/web-xpost-cards/archived-lightbox-full.png' });
}
await browser.close();
