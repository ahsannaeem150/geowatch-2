import { chromium } from 'playwright';
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, storageState: 'temp_screenshots/ui-sweep-superadmin/auth-state.json' });
const page = await ctx.newPage();
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const mutations = [];
page.on('request', (req) => {
  const m = req.method();
  if (m === 'GET' || !req.url().includes('/api/v1/')) return;
  if (m === 'POST' && req.url().includes('/auth/')) return;
  mutations.push(`${m} ${req.url()}`);
});
await page.goto('http://localhost:5175/superadmin/map', { waitUntil: 'domcontentloaded' });
await page.waitForFunction(() => !!window.__geowatchSuperadminMap, { timeout: 20000 });
await sleep(3200);
await page.evaluate(() => window.__geowatchSuperadminMap.jumpTo({ center: [56.5, 26.5], zoom: 6.5 }));
await sleep(1000);
await page.locator('button:has-text("Add Incident")').first().click();
await sleep(1400);

// FIX 1: toolbar Clear/Cancel must be the hit target at their centers
const hit = await page.evaluate(() => {
  const out = {};
  for (const title of ['Clear point', 'Cancel placement (Esc)']) {
    const b = [...document.querySelectorAll('button')].find((x) => x.title === title);
    if (!b) { out[title] = 'MISSING'; continue; }
    const r = b.getBoundingClientRect();
    const el = document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2);
    out[title] = { clickable: b.contains(el), hit: el ? `${el.tagName}.${String(el.className).slice(0, 40)}` : 'none', x: Math.round(r.x) };
  }
  return out;
});
console.log('FIX1 hit-test:', JSON.stringify(hit));
await page.screenshot({ path: 'temp_screenshots/ui-sweep-superadmin/74-fix1-toolbar-offset.png' });

// place a point, then Clear via the toolbar button (now clickable)
const p = await page.evaluate(() => { const q = window.__geowatchSuperadminMap.project([56.9, 26.2]); return { x: q.x, y: q.y }; });
await page.mouse.click(p.x, p.y);
await sleep(1200);
const filled = await page.evaluate(() => {
  const inputs = [...document.querySelectorAll('form input[type="number"]')];
  return inputs.map((i) => i.value);
});
console.log('FIX2 after place, number inputs:', JSON.stringify(filled));
await page.locator('button[title="Clear point"]').click({ timeout: 5000 });
await sleep(800);
const cleared = await page.evaluate(() => {
  const inputs = [...document.querySelectorAll('form input[type="number"]')];
  return inputs.map((i) => i.value);
});
console.log('FIX2 after Clear, number inputs:', JSON.stringify(cleared));
// re-place → fields must refill
await page.mouse.click(p.x, p.y);
await sleep(1200);
const refilled = await page.evaluate(() => {
  const inputs = [...document.querySelectorAll('form input[type="number"]')];
  return inputs.map((i) => i.value);
});
console.log('FIX2 after re-place, number inputs:', JSON.stringify(refilled));
// cancel via toolbar Cancel (now clickable) — leaves no residue
await page.locator('button[title="Cancel placement (Esc)"]').click({ timeout: 5000 });
await sleep(900);
const gone = await page.evaluate(() => !document.querySelector('button[title="Cancel placement (Esc)"]'));
console.log('placement cancelled via toolbar:', gone);
console.log('mutations:', mutations.length ? mutations : '(none)');
await browser.close();
