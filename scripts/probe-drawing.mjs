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
await sleep(3000);
await page.evaluate(() => window.__geowatchSuperadminMap.jumpTo({ center: [56.5, 26.5], zoom: 6.5 }));
await sleep(1000);
const clickAt = async (lng, lat) => {
  const p = await page.evaluate(([a, b]) => { const q = window.__geowatchSuperadminMap.project([a, b]); return { x: q.x, y: q.y }; }, [lng, lat]);
  await page.mouse.click(p.x, p.y);
};
// 1) placement: place then cancel via the FORM Cancel (real user path)
await page.locator('button:has-text("Add Incident")').first().click();
await sleep(1200);
await clickAt(56.9, 26.2);
await sleep(1200);
await page.locator('form button:has-text("Cancel"), .id-form button:has-text("Cancel")').first().click({ timeout: 5000 }).catch(async () => {
  // fallback: last visible Cancel (form is last in DOM)
  const all = page.locator('button:has-text("Cancel"):visible');
  await all.nth((await all.count()) - 1).click({ timeout: 5000 });
});
await sleep(900);
const placementGone = await page.evaluate(() => !document.querySelector('button[title="Cancel placement (Esc)"]'));
console.log('placement cancelled cleanly:', placementGone);
await page.screenshot({ path: 'temp_screenshots/ui-sweep-superadmin/71-placement-cancelled.png' });
console.log('📸 71-placement-cancelled');
// 2) drawing: Add Zone, 3 vertices, shot, cancel via title button
await page.locator('button:has-text("Add Zone")').first().click();
await sleep(1200);
await clickAt(55.9, 26.9); await sleep(500);
await clickAt(56.4, 27.1); await sleep(500);
await clickAt(56.2, 26.6); await sleep(900);
await page.screenshot({ path: 'temp_screenshots/ui-sweep-superadmin/72-drawing-toolbar-3-vertices.png' });
console.log('📸 72-drawing-toolbar-3-vertices');
await page.locator('button[title="Cancel drawing (Esc)"]').first().click({ timeout: 8000 });
await sleep(900);
const drawingGone = await page.evaluate(() => !document.querySelector('button[title="Cancel drawing (Esc)"]'));
console.log('drawing cancelled cleanly:', drawingGone);
await page.screenshot({ path: 'temp_screenshots/ui-sweep-superadmin/73-drawing-cancelled.png' });
console.log('📸 73-drawing-cancelled');
console.log('mutations:', mutations.length ? mutations : '(none)');
await browser.close();
