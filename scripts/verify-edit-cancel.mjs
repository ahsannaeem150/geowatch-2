// handleZoneEditCancel fix sanity: zone click → Edit Shape → Cancel → no errors,
// zone still hoverable/clickable, URL keeps zone= param.
import { chromium } from 'playwright';
const BASE = 'http://localhost:5174';
const STATE = 'temp_screenshots/ui-sweep-admin/auth-state.json';
const SHOTS = 'temp_screenshots/fix-verify-admin';
const pageErrors = [];
const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({ storageState: STATE, viewport: { width: 1440, height: 900 } });
const page = await ctx.newPage();
page.on('pageerror', (e) => pageErrors.push(String(e).slice(0, 250)));
page.on('console', (m) => { if (m.type() === 'error') pageErrors.push('console: ' + m.text().slice(0, 200)); });
await page.goto(BASE + '/', { waitUntil: 'domcontentloaded' });
await page.waitForSelector('.maplibregl-canvas', { timeout: 25000 });
await page.waitForFunction(() => !!window.__intelmap24AdminMap, { timeout: 25000 });
await page.waitForTimeout(5000);

async function pickPixel() {
  return page.evaluate(() => {
    const m = window.__intelmap24AdminMap;
    const canvas = document.querySelector('.maplibregl-canvas');
    const rect = canvas.getBoundingClientRect();
    for (const f of m.getSource('zones')?._data?.features || []) {
      const ring = f.geometry?.coordinates?.[0];
      if (!ring?.length) continue;
      let sx = 0, sy = 0; const n = Math.min(ring.length, 64);
      for (let i = 0; i < n; i++) { sx += ring[i][0]; sy += ring[i][1]; }
      const c = [sx / n, sy / n];
      for (const ll of [c, [(c[0] + ring[0][0]) / 2, (c[1] + ring[0][1]) / 2]]) {
        const p = m.project(ll);
        const wx = rect.left + p.x, wy = rect.top + p.y;
        if (p.x < 40 || p.y < 60 || p.x > rect.width - 40 || p.y > rect.height - 60) continue;
        let hits = 0;
        try { hits = m.queryRenderedFeatures(p, { layers: ['zone-hit'] }).length; } catch { continue; }
        if (hits >= 1 && document.elementFromPoint(wx, wy) === canvas) return { id: String(f.properties.id), name: f.properties.name, x: wx, y: wy };
      }
    }
    return null;
  });
}

await page.evaluate(() => window.__intelmap24AdminMap.jumpTo({ center: [56, 26.5], zoom: 6.0 }));
await page.waitForTimeout(1200);
const px = await pickPixel();
await page.mouse.click(px.x, px.y);
await page.waitForTimeout(1500);
console.log('zone opened:', await page.evaluate(() => new URLSearchParams(location.search).get('zone')));

const editBtn = page.locator('button:has-text("Edit Shape"), button:has-text("Edit shape")').first();
await editBtn.click();
await page.waitForTimeout(1200);
const editing = await page.evaluate(() => !!window.__intelmap24AdminMap.getSource('edit-vertices')?._data?.features?.length);
console.log('edit mode entered (vertices rendered):', editing);
await page.screenshot({ timeout: 8000, animations: 'disabled', path: `${SHOTS}/edit-cancel-editing.png` }).catch(() => {});

// Edit-mode cancel is bound to Escape (AdminMap onEditCancel)
await page.keyboard.press('Escape');
await page.waitForTimeout(1200);
await page.screenshot({ timeout: 8000, animations: 'disabled', path: `${SHOTS}/edit-cancel-after.png` }).catch(() => {});
const after = await page.evaluate(() => ({
  zoneParam: new URLSearchParams(location.search).get('zone'),
  editVerts: (window.__intelmap24AdminMap.getSource('edit-vertices')?._data?.features || []).length,
  hitLayer: !!window.__intelmap24AdminMap.getLayer('zone-hit'),
}));
console.log('after cancel:', JSON.stringify(after));

// hover + click a zone again to confirm interactivity survived
const px2 = await pickPixel();
await page.mouse.move(px2.x, px2.y, { steps: 4 });
await page.waitForTimeout(400);
const cursor = await page.evaluate(() => window.__intelmap24AdminMap.getCanvas().style.cursor);
console.log('post-cancel hover cursor:', cursor);

console.log('errors:', pageErrors.slice(0, 10));
console.log(after.zoneParam === px.id && after.hitLayer && cursor === 'pointer' && pageErrors.length === 0 ? 'EDIT CANCEL: OK' : 'EDIT CANCEL: CHECK');
await browser.close();
