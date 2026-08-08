// Trace every history mutation around a panel-open zone switch click.
import { chromium } from 'playwright';
const BASE = 'http://localhost:5174';
const STATE = 'temp_screenshots/ui-sweep-admin/auth-state.json';
const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({ storageState: STATE, viewport: { width: 1440, height: 900 } });
const page = await ctx.newPage();
page.on('console', (m) => { if (m.text().startsWith('[trace]')) console.log(m.text().slice(0, 400)); });
await page.goto(BASE + '/', { waitUntil: 'domcontentloaded' });
await page.waitForSelector('.maplibregl-canvas', { timeout: 25000 });
await page.waitForFunction(() => !!window.__intelmap24AdminMap, { timeout: 25000 });
await page.waitForTimeout(5000);

await page.evaluate(() => {
  window.__traceOn = false;
  for (const fn of ['pushState', 'replaceState']) {
    const orig = history[fn].bind(history);
    history[fn] = (...args) => {
      if (window.__traceOn) {
        const url = String(args[2]);
        if (url.includes('zone') || url.includes('incident')) {
          const stack = new Error().stack.split('\n').slice(2, 8).join(' | ');
          console.log(`[trace] ${fn} → ${url.slice(-80)}\n[trace]   ${stack}`);
        }
      }
      return orig(...args);
    };
  }
});

async function pickPixel(nameLike) {
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
      for (const ll of [c, [(c[0] + ring[0][0]) / 2, (c[1] + ring[0][1]) / 2]]) {
        const p = m.project(ll);
        const wx = rect.left + p.x, wy = rect.top + p.y;
        let hits = 0;
        try { hits = m.queryRenderedFeatures(p, { layers: ['zone-hit'] }).length; } catch { continue; }
        if (hits >= 1 && document.elementFromPoint(wx, wy) === canvas) return { id: String(f.properties.id), name: f.properties.name, x: wx, y: wy };
      }
    }
    return null;
  }, nameLike);
}

// Step 1: open Hormuz panel
await page.evaluate(() => window.__intelmap24AdminMap.jumpTo({ center: [56, 26.5], zoom: 6.0 }));
await page.waitForTimeout(1200);
const hz = await pickPixel('Hormuz');
await page.mouse.click(hz.x, hz.y);
await page.waitForTimeout(1500);
console.log('[trace] --- panel now open, param:', await page.evaluate(() => new URLSearchParams(location.search).get('zone')));

// Step 2: trace the Waziristan click
await page.evaluate(() => { window.__traceOn = true; });
await page.evaluate(() => window.__intelmap24AdminMap.jumpTo({ center: [68.5, 33.0], zoom: 6.0 }));
await page.waitForTimeout(1500);
const wz = await pickPixel('Waziristan');
console.log('[trace] --- clicking Waziristan at', Math.round(wz.x), Math.round(wz.y));
await page.mouse.click(wz.x, wz.y);
await page.waitForTimeout(2500);
await page.evaluate(() => { window.__traceOn = false; });
console.log('[trace] --- final param:', await page.evaluate(() => new URLSearchParams(location.search).get('zone')));
await browser.close();
