// Repro: BUG C — zones un-hoverable/un-clickable after incident= (zone id) deep-link.
// Loads the owner's exact URL, inspects zone source/layer state, physically
// tests hover cursor + click on a zone polygon. Read-only.
import { chromium } from 'playwright';

const BASE = 'http://localhost:5174';
const OWNER_URL = '/?lat=33.180305&lng=69.393873&zoom=6.91&incident=6c389d6d-dd39-4eec-b29c-b2358beca60c';
const STATE = 'temp_screenshots/ui-sweep-admin/auth-state.json';
const SHOTS = 'temp_screenshots/fix-verify-admin';

const consoleErrors = [];
const pageErrors = [];

async function zoneDiagnostics(page, label) {
  const diag = await page.evaluate(() => {
    const m = window.__geowatchAdminMap;
    if (!m) return { map: false };
    const src = m.getSource('zones');
    const data = src?._data;
    const features = data?.features || [];
    // project each zone's first-ring centroid, test hit layer at that pixel
    const tests = [];
    for (const f of features) {
      const ring = f.geometry?.coordinates?.[0];
      if (!ring || !ring.length) continue;
      let sx = 0, sy = 0;
      const n = Math.min(ring.length, 64);
      for (let i = 0; i < n; i++) { sx += ring[i][0]; sy += ring[i][1]; }
      const c = [sx / n, sy / n];
      const p = m.project(c);
      const vp = m.getCanvas();
      const inside = p.x >= 0 && p.y >= 0 && p.x <= vp.width && p.y <= vp.height;
      let hits = -1;
      try { hits = m.queryRenderedFeatures(p, { layers: ['zone-hit'] }).length; } catch (e) { hits = `ERR ${e.message}`; }
      tests.push({ id: String(f.id).slice(0, 8), name: f.properties?.name?.slice(0, 40), px: [Math.round(p.x), Math.round(p.y)], insideViewport: inside, hits });
    }
    return {
      map: true,
      layer: !!m.getLayer('zone-hit'),
      sourceFeatures: features.length,
      tests,
      cursor: m.getCanvas().style.cursor,
      url: location.search,
    };
  });
  console.log(`\n=== ${label} ===`);
  console.log(JSON.stringify(diag, null, 1));
  return diag;
}

async function hoverAndClickTest(page, label, shots = true) {
  // pick a zone pixel that is in the viewport, NOT under the right panel,
  // and where document.elementFromPoint is the map canvas (no marker/panel cover)
  const target = await page.evaluate(() => {
    const m = window.__geowatchAdminMap;
    const canvas = document.querySelector('.maplibregl-canvas');
    const rect = canvas.getBoundingClientRect();
    const feats = m.getSource('zones')?._data?.features || [];
    const candidates = [];
    for (const f of feats) {
      const ring = f.geometry?.coordinates?.[0];
      if (!ring?.length) continue;
      let sx = 0, sy = 0;
      const n = Math.min(ring.length, 64);
      for (let i = 0; i < n; i++) { sx += ring[i][0]; sy += ring[i][1]; }
      const c = [sx / n, sy / n];
      candidates.push({ f, ll: c, kind: 'centroid' });
      // midpoints between centroid and a few ring vertices stay inside most polygons
      for (const i of [0, Math.floor(n / 3), Math.floor((2 * n) / 3)]) {
        candidates.push({ f, ll: [(c[0] + ring[i][0]) / 2, (c[1] + ring[i][1]) / 2], kind: 'mid' });
      }
    }
    for (const cand of candidates) {
      const p = m.project(cand.ll);
      const wx = rect.left + p.x, wy = rect.top + p.y;
      if (p.x < 40 || p.y < 60 || p.x > rect.width - 40 || p.y > rect.height - 60) continue;
      // must hit the zone-hit layer here (centroid of a concave ring can fall outside)
      let hits = 0;
      try { hits = m.queryRenderedFeatures(p, { layers: ['zone-hit'] }).length; } catch { continue; }
      if (hits < 1) continue;
      const el = document.elementFromPoint(wx, wy);
      if (el !== canvas) continue;
      return { id: String(cand.f.id), name: cand.f.properties?.name, x: wx, y: wy, kind: cand.kind };
    }
    return null;
  });
  if (!target) { console.log(`\n--- ${label}: no unoccluded zone pixel found, skipping physical test`); return null; }
  console.log(`\n--- ${label}: physical test on zone "${target.name}" (${target.kind}) @ ${Math.round(target.x)},${Math.round(target.y)}`);
  await page.mouse.move(target.x, target.y, { steps: 5 });
  await page.waitForTimeout(500);
  const cursor = await page.evaluate(() => window.__geowatchAdminMap.getCanvas().style.cursor);
  const urlBefore = page.url();
  await page.mouse.click(target.x, target.y);
  await page.waitForTimeout(1000);
  const urlAfter = page.url();
  const panel = await page.evaluate(() => {
    const p = document.querySelector('.dashboard-right-panel');
    return p ? p.textContent.slice(0, 100) : null;
  });
  console.log(JSON.stringify({ cursor, urlChanged: urlBefore !== urlAfter, urlAfter: urlAfter.slice(-70), panel: panel ? panel.slice(0, 70) : 'NONE' }));
  if (shots) await page.screenshot({ path: `${SHOTS}/repro-${label.replace(/\W+/g, '-').toLowerCase()}.png` });
  return { cursor, urlChanged: urlBefore !== urlAfter, panelOpen: !!panel };
}

const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({ storageState: STATE, viewport: { width: 1440, height: 900 } });
const page = await ctx.newPage();
page.on('console', (msg) => { if (msg.type() === 'error') consoleErrors.push(msg.text().slice(0, 300)); });
page.on('pageerror', (err) => pageErrors.push(String(err).slice(0, 300)));

// ─── Scenario 1: owner URL (incident=<zone id> deep link) ───
await page.goto(BASE + OWNER_URL, { waitUntil: 'domcontentloaded' });
await page.waitForSelector('.maplibregl-canvas', { timeout: 25000 });
await page.waitForFunction(() => !!window.__geowatchAdminMap, { timeout: 25000 });
await page.waitForTimeout(6000); // let incidents/zones load + deep-link effect run

await zoneDiagnostics(page, 'owner-url-after-load');
await hoverAndClickTest(page, 'owner-url-zone-hover');

// ─── Scenario 2: plain map, no deep link — baseline sanity ───
await page.goto(BASE + '/', { waitUntil: 'domcontentloaded' });
await page.waitForSelector('.maplibregl-canvas', { timeout: 25000 });
await page.waitForFunction(() => !!window.__geowatchAdminMap, { timeout: 25000 });
await page.waitForTimeout(5000);
await zoneDiagnostics(page, 'plain-map-baseline');
await hoverAndClickTest(page, 'plain-map-zone-hover');

console.log('\n=== console errors ===');
console.log(consoleErrors.slice(0, 15));
console.log('=== page errors ===');
console.log(pageErrors.slice(0, 15));

await browser.close();
