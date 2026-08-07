// Spy on what the zone click path observes at click time near Waziristan.
import { chromium } from 'playwright';
const BASE = 'http://localhost:5174';
const STATE = 'temp_screenshots/ui-sweep-admin/auth-state.json';
const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({ storageState: STATE, viewport: { width: 1440, height: 900 } });
const page = await ctx.newPage();
page.on('pageerror', (e) => console.log('PAGEERROR:', String(e).slice(0, 200)));
await page.goto(BASE + '/', { waitUntil: 'domcontentloaded' });
await page.waitForSelector('.maplibregl-canvas', { timeout: 25000 });
await page.waitForFunction(() => !!window.__geowatchAdminMap, { timeout: 25000 });
await page.waitForTimeout(5000);

await page.evaluate(() => window.__geowatchAdminMap.jumpTo({ center: [68.5, 33.0], zoom: 6.5 }));
await page.waitForTimeout(1500);

// Find the Waziristan pixel (same logic as before)
const pixel = await page.evaluate(() => {
  const m = window.__geowatchAdminMap;
  const canvas = document.querySelector('.maplibregl-canvas');
  const rect = canvas.getBoundingClientRect();
  const feats = m.getSource('zones')?._data?.features || [];
  for (const f of feats) {
    if (!String(f.properties?.name || '').includes('Waziristan')) continue;
    const ring = f.geometry?.coordinates?.[0];
    let sx = 0, sy = 0; const n = Math.min(ring.length, 64);
    for (let i = 0; i < n; i++) { sx += ring[i][0]; sy += ring[i][1]; }
    const c = [sx / n, sy / n];
    for (const ll of [c, [(c[0] + ring[0][0]) / 2, (c[1] + ring[0][1]) / 2]]) {
      const p = m.project(ll);
      const wx = rect.left + p.x, wy = rect.top + p.y;
      let hits = 0;
      try { hits = m.queryRenderedFeatures(p, { layers: ['zone-hit'] }).length; } catch {}
      if (hits >= 1 && document.elementFromPoint(wx, wy) === canvas) return { x: wx, y: wy, id: String(f.properties.id) };
    }
  }
  return null;
});
console.log('pixel:', JSON.stringify(pixel));
if (!pixel) { console.log('no pixel'); await browser.close(); process.exit(0); }

// Install spy: capture what a click at that point sees
await page.evaluate(() => {
  window.__spy = [];
  const m = window.__geowatchAdminMap;
  m.on('click', (e) => {
    let feats = [];
    try { feats = m.queryRenderedFeatures(e.point, { layers: ['zone-hit'] }); } catch (err) { window.__spy.push({ err: String(err) }); return; }
    window.__spy.push({
      point: [Math.round(e.point.x), Math.round(e.point.y)],
      n: feats.length,
      ids: feats.map((f) => `${f.properties?.name} (id=${String(f.id)}, pid=${f.properties?.id})`),
      targetIsCanvas: e.originalEvent?.target === m.getCanvas(),
      targetClosest: e.originalEvent?.target?.closest?.('.maplibregl-marker') ? 'marker' : 'none',
    });
  });
});
await page.mouse.click(pixel.x, pixel.y);
await page.waitForTimeout(1200);
console.log(JSON.stringify(await page.evaluate(() => window.__spy), null, 1));
console.log('zone param:', await page.evaluate(() => new URLSearchParams(location.search).get('zone')));
await browser.close();
