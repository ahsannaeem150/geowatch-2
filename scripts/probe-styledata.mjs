// Instrument styledata timing during a theme toggle: isStyleLoaded + layer presence at each fire.
import { chromium } from 'playwright';
const BASE = 'http://localhost:5174';
const STATE = 'temp_screenshots/ui-sweep-admin/auth-state.json';
const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({ storageState: STATE, viewport: { width: 1440, height: 900 } });
const page = await ctx.newPage();
await page.goto(BASE + '/', { waitUntil: 'domcontentloaded' });
await page.waitForSelector('.maplibregl-canvas', { timeout: 25000 });
await page.waitForFunction(() => !!window.__geowatchAdminMap, { timeout: 25000 });
await page.waitForTimeout(5000);
await page.evaluate(() => {
  window.__sd = [];
  const m = window.__geowatchAdminMap;
  m.on('styledata', () => {
    window.__sd.push({ t: Math.round(performance.now()), loaded: m.isStyleLoaded(), layer: !!m.getLayer('zone-hit'), src: !!m.getSource('zones') });
  });
  m.on('style.load', () => window.__sd.push({ t: Math.round(performance.now()), event: 'style.load' }));
});
await page.click('button[title="Settings"]');
await page.waitForTimeout(900);
const sel = 'button[title="Switch to light mode"], button[title="Switch to dark mode"]';
await page.locator(sel).first().click();
await page.waitForTimeout(3000);
const sd = await page.evaluate(() => window.__sd);
const after = await page.evaluate(() => {
  const m = window.__geowatchAdminMap;
  return { loaded: m.isStyleLoaded(), layer: !!m.getLayer('zone-hit'), src: !!m.getSource('zones') };
});
console.log('events:', JSON.stringify(sd, null, 1));
console.log('after 3s:', JSON.stringify(after));
await browser.close();
