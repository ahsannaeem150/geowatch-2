// Isolate the panel-open zone-switch quirk: spy on the map click path with the zone panel OPEN.
import { chromium } from 'playwright';
const BASE = 'http://localhost:5174';
const STATE = 'temp_screenshots/ui-sweep-admin/auth-state.json';
const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({ storageState: STATE, viewport: { width: 1440, height: 900 } });
const page = await ctx.newPage();
page.on('pageerror', (e) => console.log('PAGEERROR:', String(e).slice(0, 300)));
page.on('console', (m) => { if (m.type() === 'error') console.log('CONSOLE:', m.text().slice(0, 200)); });
await page.goto(BASE + '/', { waitUntil: 'domcontentloaded' });
await page.waitForSelector('.maplibregl-canvas', { timeout: 25000 });
await page.waitForFunction(() => !!window.__intelmap24AdminMap, { timeout: 25000 });
await page.waitForTimeout(5000);

async function pickPixel(page, nameLike) {
  return page.evaluate((nameLike) => {
    const m = window.__intelmap24AdminMap;
    const canvas = document.querySelector('.maplibregl-canvas');
    const rect = canvas.getBoundingClientRect();
    for (const f of m.getSource('zones')?._data?.features || []) {
      if (nameLike && !String(f.properties?.name || '').includes(nameLike)) continue;
      const ring = f.geometry?.coordinates?.[0];
      if (!ring?.length) continue;
      let sx = 0, sy = 0; const n = Math.min(ring.length, 64);
      for (let i = 0; i < n; i++) { sx += ring[i][0]; sy += ring[i][1]; }
      const c = [sx / n, sy / n];
      const cands = [c];
      for (const i of [0, Math.floor(n / 3), Math.floor((2 * n) / 3)]) cands.push([(c[0] + ring[i][0]) / 2, (c[1] + ring[i][1]) / 2]);
      for (const ll of cands) {
        const p = m.project(ll);
        const wx = rect.left + p.x, wy = rect.top + p.y;
        if (p.x < 40 || p.y < 60 || p.x > rect.width - 40 || p.y > rect.height - 60) continue;
        let hits = 0;
        try { hits = m.queryRenderedFeatures(p, { layers: ['zone-hit'] }).length; } catch { continue; }
        if (hits < 1 || document.elementFromPoint(wx, wy) !== canvas) continue;
        return { id: String(f.properties.id), name: f.properties.name, x: wx, y: wy };
      }
    }
    return null;
  }, nameLike);
}
const zoneParam = () => page.evaluate(() => new URLSearchParams(location.search).get('zone'));

// Step 1: click Hormuz → panel opens
await page.evaluate(() => window.__intelmap24AdminMap.jumpTo({ center: [56, 26.5], zoom: 6.0 }));
await page.waitForTimeout(1200);
const hz = await pickPixel(page, 'Hormuz');
await page.mouse.click(hz.x, hz.y);
await page.waitForTimeout(1500);
console.log('step1 Hormuz click → param:', await zoneParam());

// Step 2: install spy, click Waziristan with panel OPEN
await page.evaluate(() => {
  window.__spy = [];
  const m = window.__intelmap24AdminMap;
  m.on('click', (e) => {
    let feats = [];
    try { feats = m.queryRenderedFeatures(e.point, { layers: ['zone-hit'] }); } catch (err) { window.__spy.push({ err: String(err) }); return; }
    window.__spy.push({
      n: feats.length,
      ids: feats.map((f) => String(f.id)),
      targetIsCanvas: e.originalEvent?.target === m.getCanvas(),
      marker: e.originalEvent?.target?.closest?.('.maplibregl-marker') ? 'yes' : 'no',
    });
  });
});
await page.evaluate(() => window.__intelmap24AdminMap.jumpTo({ center: [68.5, 33.0], zoom: 6.0 }));
await page.waitForTimeout(1500);
const wz = await pickPixel(page, 'Waziristan');
console.log('waziristan pixel:', JSON.stringify(wz));
await page.mouse.click(wz.x, wz.y);
await page.waitForTimeout(1500);
console.log('spy:', JSON.stringify(await page.evaluate(() => window.__spy)));
console.log('step2 Waziristan click → param:', await zoneParam());
await browser.close();
