import { chromium } from 'playwright';
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, storageState: 'temp_screenshots/ui-sweep-superadmin/auth-state.json' });
const page = await ctx.newPage();
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
await page.goto('http://localhost:5175/superadmin/map', { waitUntil: 'domcontentloaded' });
await page.waitForFunction(() => !!window.__intelmap24SuperadminMap, { timeout: 20000 });
await sleep(3000);
await page.evaluate(() => window.__intelmap24SuperadminMap.jumpTo({ center: [56.5, 26.5], zoom: 6.5 }));
await sleep(1000);
await page.locator('button:has-text("Add Incident")').first().click();
await sleep(1200);
const info = await page.evaluate(() => {
  const btns = [...document.querySelectorAll('button')].filter((b) => /cancel/i.test(b.textContent) && b.offsetParent !== null);
  return btns.map((b) => {
    const r = b.getBoundingClientRect();
    const el = document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2);
    const desc = (e) => e ? `${e.tagName}.${String(e.className).slice(0, 60)}${e === b ? ' [SELF]' : ''}` : 'none';
    return { text: b.textContent.trim().slice(0, 20), title: b.title, rect: { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) }, hit: desc(el), hitInsideButton: b.contains(el) };
  });
});
console.log(JSON.stringify(info, null, 1));
// try the form panel cancel via elementFromPoint-safe dispatch
await browser.close();
