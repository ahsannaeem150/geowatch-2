// Record full event sequence (styledata/style.load/idle/data) around a theme toggle.
import { chromium } from 'playwright';
const BASE = 'http://localhost:5174';
const STATE = 'temp_screenshots/ui-sweep-admin/auth-state.json';
const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({ storageState: STATE, viewport: { width: 1440, height: 900 } });
const page = await ctx.newPage();
await page.goto(BASE + '/', { waitUntil: 'domcontentloaded' });
await page.waitForSelector('.maplibregl-canvas', { timeout: 25000 });
await page.waitForFunction(() => !!window.__intelmap24AdminMap, { timeout: 25000 });
await page.waitForTimeout(5000);
await page.evaluate(() => {
  window.__ev = [];
  const m = window.__intelmap24AdminMap;
  const t0 = performance.now();
  for (const ev of ['styledata', 'style.load', 'idle', 'data', 'render']) {
    m.on(ev, () => {
      window.__ev.push({ ev, t: Math.round(performance.now() - t0), loaded: m.isStyleLoaded(), layer: !!m.getLayer('zone-hit') });
    });
  }
  window.__mark = () => { t0Ref = performance.now(); };
  window.__ev.push({ ev: 'listeners-bound', t: 0 });
});
await page.click('button[title="Settings"]');
await page.waitForTimeout(900);
// reset timeline right before the toggle
await page.evaluate(() => { window.__ev.length = 0; });
const sel = 'button[title="Switch to light mode"], button[title="Switch to dark mode"]';
await page.locator(sel).first().click();
await page.waitForTimeout(4000);
const ev = await page.evaluate(() => window.__ev);
// compress consecutive duplicate events
const compact = [];
for (const e of ev) {
  const last = compact[compact.length - 1];
  if (last && last.ev === e.ev && last.loaded === e.loaded && last.layer === e.layer) last.n = (last.n || 1) + 1;
  else compact.push({ ...e });
}
console.log(JSON.stringify(compact, null, 1));
await browser.close();
