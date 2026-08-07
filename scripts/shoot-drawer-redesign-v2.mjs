// Drawer redesign v2 screenshots + pinned-right x-position proof.
import { chromium } from 'playwright';
const BASE = 'http://localhost:5174';
const STATE = 'temp_screenshots/ui-sweep-admin/auth-state.json';
const SHOTS = 'temp_screenshots/drawer-redesign-v2';

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

// Measure right-edge x of meta-row right groups + 24H+ spans across visible cards
async function measureMeta() {
  return page.evaluate(() => {
    const rows = [...document.querySelectorAll('div')].filter((d) =>
      d.style.justifyContent === 'space-between' && d.style.whiteSpace === 'nowrap' && d.textContent.includes('·'));
    return rows.slice(0, 10).map((d) => {
      const right = d.lastElementChild;
      const rr = right.getBoundingClientRect();
      const flag = [...d.querySelectorAll('span')].find((s) => s.textContent.trim().toUpperCase() === '24H+');
      const fr = flag?.getBoundingClientRect();
      const ellSpan = d.querySelector('span[style*="text-overflow"]');
      return {
        meta: d.textContent.slice(0, 55),
        rightEdge: Math.round(rr.right),
        flagX: fr ? Math.round(fr.x) : null,
        flagRight: fr ? Math.round(fr.right) : null,
        ellipsized: ellSpan ? ellSpan.scrollWidth > ellSpan.clientWidth + 1 : null,
      };
    });
  });
}

// 1. Active — dark
await page.click('button[title="Active"]');
await page.waitForTimeout(1200);
console.log('active meta (dark):', JSON.stringify(await measureMeta(), null, 1));
await page.screenshot({ path: `${SHOTS}/active-dark.png`, timeout: 10000, animations: 'disabled' });
console.log('shot active-dark', await theme());

// 2. Active — light
await toggleTheme();
await page.click('button[title="Active"]');
await page.waitForTimeout(1200);
console.log('active meta (light):', JSON.stringify((await measureMeta()).slice(0, 4)));
await page.screenshot({ path: `${SHOTS}/active-light.png`, timeout: 10000, animations: 'disabled' });
console.log('shot active-light', await theme());

// 3. Saved — light
await page.click('button[title="Saved"]');
await page.waitForTimeout(1200);
console.log('saved meta (light):', JSON.stringify((await measureMeta()).slice(0, 4)));
await page.screenshot({ path: `${SHOTS}/saved-light.png`, timeout: 10000, animations: 'disabled' });
console.log('shot saved-light', await theme());

// 4. Saved — dark
await toggleTheme();
await page.click('button[title="Saved"]');
await page.waitForTimeout(1200);
await page.screenshot({ path: `${SHOTS}/saved-dark.png`, timeout: 10000, animations: 'disabled' });
console.log('shot saved-dark', await theme());

await browser.close();
