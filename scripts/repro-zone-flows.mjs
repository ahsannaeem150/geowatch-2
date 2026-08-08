// Flow repro for BUG C: walk owner-like flows, probe zone hover after each step.
import { chromium } from 'playwright';

const BASE = 'http://localhost:5174';
const STATE = 'temp_screenshots/ui-sweep-admin/auth-state.json';
const SHOTS = 'temp_screenshots/fix-verify-admin';

const pageErrors = [];

async function pickZonePixel(page) {
  return page.evaluate(() => {
    const m = window.__intelmap24AdminMap;
    const canvas = document.querySelector('.maplibregl-canvas');
    const rect = canvas.getBoundingClientRect();
    const feats = m.getSource('zones')?._data?.features || [];
    const cands = [];
    for (const f of feats) {
      const ring = f.geometry?.coordinates?.[0];
      if (!ring?.length) continue;
      let sx = 0, sy = 0;
      const n = Math.min(ring.length, 64);
      for (let i = 0; i < n; i++) { sx += ring[i][0]; sy += ring[i][1]; }
      const c = [sx / n, sy / n];
      cands.push({ f, ll: c });
      for (const i of [0, Math.floor(n / 3), Math.floor((2 * n) / 3)]) {
        cands.push({ f, ll: [(c[0] + ring[i][0]) / 2, (c[1] + ring[i][1]) / 2] });
      }
    }
    for (const cand of cands) {
      const p = m.project(cand.ll);
      const wx = rect.left + p.x, wy = rect.top + p.y;
      if (p.x < 40 || p.y < 60 || p.x > rect.width - 40 || p.y > rect.height - 60) continue;
      let hits = 0;
      try { hits = m.queryRenderedFeatures(p, { layers: ['zone-hit'] }).length; } catch { continue; }
      if (hits < 1) continue;
      if (document.elementFromPoint(wx, wy) !== canvas) continue;
      return { name: cand.f.properties?.name, x: wx, y: wy, hits };
    }
    return null;
  });
}

async function probe(page, label) {
  const diag = await page.evaluate(() => {
    const m = window.__intelmap24AdminMap;
    return {
      layer: !!m.getLayer('zone-hit'),
      srcFeatures: (m.getSource('zones')?._data?.features || []).length,
      cursorBefore: m.getCanvas().style.cursor,
      url: location.search.slice(-60),
    };
  });
  const t = await pickZonePixel(page);
  if (!t) {
    console.log(`\n### ${label}: NO unoccluded zone pixel | ${JSON.stringify(diag)}`);
    await page.screenshot({ path: `${SHOTS}/flow-${label.replace(/\W+/g, '-').toLowerCase()}.png` });
    return { dead: null, diag };
  }
  await page.mouse.move(200, 300, { steps: 2 }); // reset hover away from zones
  await page.waitForTimeout(250);
  await page.mouse.move(t.x, t.y, { steps: 5 });
  await page.waitForTimeout(450);
  const cursor = await page.evaluate(() => window.__intelmap24AdminMap.getCanvas().style.cursor);
  const dead = cursor !== 'pointer';
  console.log(`\n### ${label}: hover "${t.name}" @${Math.round(t.x)},${Math.round(t.y)} hits=${t.hits} → cursor="${cursor}" ${dead ? '*** DEAD ***' : 'OK'}`);
  console.log('    diag:', JSON.stringify(diag));
  await page.screenshot({ path: `${SHOTS}/flow-${label.replace(/\W+/g, '-').toLowerCase()}.png` });
  return { dead, cursor, diag, pixel: t };
}

const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({ storageState: STATE, viewport: { width: 1440, height: 900 } });
const page = await ctx.newPage();
page.on('pageerror', (err) => pageErrors.push(String(err).slice(0, 250)));
page.on('console', (msg) => { if (msg.type() === 'error') pageErrors.push('console: ' + msg.text().slice(0, 200)); });

await page.goto(BASE + '/', { waitUntil: 'domcontentloaded' });
await page.waitForSelector('.maplibregl-canvas', { timeout: 25000 });
await page.waitForFunction(() => !!window.__intelmap24AdminMap, { timeout: 25000 });
await page.waitForTimeout(5000);

await probe(page, 'baseline');

// ─── Flow 1: Active drawer → click ZONE row (the A2 path) ───
await page.click('button[title="Active"]');
await page.waitForTimeout(1200);
const zoneRow = page.locator('text=High-Risk Transit Corridor').first();
await zoneRow.click();
await page.waitForTimeout(1500);
console.log('\n[flow1] after drawer zone-row click, url =', page.url().slice(-70));
await page.click('button[title="Active"]'); // close drawer
await page.waitForTimeout(600);
await probe(page, 'after-drawer-zone-row');

// ─── Flow 2: click zone on map → zone sidebar → Edit Shape → cancel ───
const r2 = await probe(page, 'before-edit-shape');
if (r2?.pixel) {
  await page.mouse.click(r2.pixel.x, r2.pixel.y);
  await page.waitForTimeout(1500);
  const editShape = page.locator('button:has-text("Edit Shape"), button:has-text("Edit shape")').first();
  if (await editShape.count()) {
    await editShape.click();
    await page.waitForTimeout(1200);
    console.log('\n[flow2] edit shape entered, url =', page.url().slice(-60));
    const cancelBtn = page.locator('button:has-text("Cancel")').first();
    if (await cancelBtn.count()) { await cancelBtn.click(); await page.waitForTimeout(800); }
    console.log('[flow2] edit cancelled');
  } else {
    console.log('\n[flow2] no Edit Shape button found in sidebar');
  }
  await probe(page, 'after-edit-shape-cancel');
}

// ─── Flow 3: placement mode enter → Esc Esc ───
await page.keyboard.press('Escape'); // close any panel first
await page.waitForTimeout(400);
const addIncident = page.locator('button:has-text("Add Incident")').first();
if (await addIncident.count()) {
  await addIncident.click();
  await page.waitForTimeout(1200);
  await page.keyboard.press('Escape');
  await page.waitForTimeout(400);
  await page.keyboard.press('Escape');
  await page.waitForTimeout(800);
  console.log('\n[flow3] placement entered+escaped, url =', page.url().slice(-60));
}
await probe(page, 'after-placement-esc');

// ─── Flow 4: draw zone → 2 clicks → Esc ───
const addZone = page.locator('button:has-text("Add Zone")').first();
if (await addZone.count()) {
  await addZone.click();
  await page.waitForTimeout(1000);
  await page.mouse.click(600, 450);
  await page.mouse.click(700, 500);
  await page.waitForTimeout(300);
  await page.keyboard.press('Escape');
  await page.waitForTimeout(900);
  console.log('\n[flow4] draw cancelled via Esc');
}
await probe(page, 'after-draw-esc');

console.log('\n=== page/console errors ===');
console.log(pageErrors.slice(0, 20));
await browser.close();
