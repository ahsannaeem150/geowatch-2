// A/B: does a far-region zone click switch the zone= param (a) on fresh load, (b) after theme toggle?
import { chromium } from 'playwright';
const BASE = 'http://localhost:5174';
const STATE = 'temp_screenshots/ui-sweep-admin/auth-state.json';

async function pickPixels(page, want = 3) {
  return page.evaluate((want) => {
    const m = window.__intelmap24AdminMap;
    const canvas = document.querySelector('.maplibregl-canvas');
    const rect = canvas.getBoundingClientRect();
    const feats = m.getSource('zones')?._data?.features || [];
    const out = []; const seen = new Set();
    for (const f of feats) {
      const id = String(f.properties?.id || f.id);
      if (seen.has(id)) continue;
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
        out.push({ id, name: f.properties?.name, x: wx, y: wy }); seen.add(id); break;
      }
      if (out.length >= want) break;
    }
    return out;
  }, want);
}
const zoneParam = (page) => page.evaluate(() => new URLSearchParams(location.search).get('zone'));
async function clickZoneAndReport(page, label, pixels) {
  if (!pixels.length) { console.log(`${label}: no pixel (inconclusive)`); return; }
  const before = await zoneParam(page);
  await page.mouse.click(pixels[0].x, pixels[0].y);
  await page.waitForTimeout(1400);
  const after = await zoneParam(page);
  const ok = after === pixels[0].id;
  console.log(`${label}: clicked "${pixels[0].name}" @${Math.round(pixels[0].x)},${Math.round(pixels[0].y)} → ${before} → ${after} ${ok ? 'OK' : '*** NO SWITCH ***'}`);
}

const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({ storageState: STATE, viewport: { width: 1440, height: 900 } });
const page = await ctx.newPage();
page.on('pageerror', (e) => console.log('PAGEERROR:', String(e).slice(0, 200)));
await page.goto(BASE + '/', { waitUntil: 'domcontentloaded' });
await page.waitForSelector('.maplibregl-canvas', { timeout: 25000 });
await page.waitForFunction(() => !!window.__intelmap24AdminMap, { timeout: 25000 });
await page.waitForTimeout(5000);

// (a) FRESH LOAD: fly to Hormuz, click; then fly to Waziristan, click
await page.evaluate(() => window.__intelmap24AdminMap.jumpTo({ center: [56, 26.5], zoom: 6.5 }));
await page.waitForTimeout(1500);
await clickZoneAndReport(page, 'fresh/Hormuz  ', await pickPixels(page));
await page.evaluate(() => window.__intelmap24AdminMap.jumpTo({ center: [68.5, 33.0], zoom: 6.5 }));
await page.waitForTimeout(1500);
await clickZoneAndReport(page, 'fresh/Waziristan', await pickPixels(page));

// (b) THEME TOGGLE, then repeat
await page.click('button[title="Settings"]');
await page.waitForTimeout(900);
await page.locator('button[title="Switch to light mode"], button[title="Switch to dark mode"]').first().click();
await page.waitForTimeout(2500);
await page.evaluate(() => window.__intelmap24AdminMap.jumpTo({ center: [56, 26.5], zoom: 6.5 }));
await page.waitForTimeout(1500);
await clickZoneAndReport(page, 'light/Hormuz  ', await pickPixels(page));
await page.evaluate(() => window.__intelmap24AdminMap.jumpTo({ center: [68.5, 33.0], zoom: 6.5 }));
await page.waitForTimeout(1500);
await clickZoneAndReport(page, 'light/Waziristan', await pickPixels(page));

await browser.close();
