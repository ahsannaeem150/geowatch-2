import { chromium } from 'playwright';
import { existsSync, mkdirSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const OUT = join(ROOT, 'temp_screenshots', 'smart-zoom-user');

if (!existsSync(OUT)) mkdirSync(OUT, { recursive: true });

const USER_BASE = 'http://localhost:5173';
const API_BASE = process.env.API_BASE || 'http://localhost:3100/api/v1';
const VIEWPORT = { width: 1440, height: 900 };

// Test fixtures: created via the API as admin and soft-deleted at the end, so
// the script does not depend on seeded data. 4 point incidents (distinct
// coordinates → distinct repeat-guard signatures), a tiny <2 km diagonal zone
// (size cap 11) and a huge >3000 km trans-regional zone (min-zoom clamp +
// containment). All centered inside HOT_BBOX so the maxZoom clamp doesn't
// confound the zoom assertions.
function squareRing(cx, cy, half) {
  return [
    [cx - half, cy - half],
    [cx + half, cy - half],
    [cx + half, cy + half],
    [cx - half, cy + half],
    [cx - half, cy - half],
  ];
}
const POINT_FIXTURES = [
  { lng: 67.70, lat: 31.20 },
  { lng: 67.78, lat: 31.24 },
  { lng: 67.62, lat: 31.16 },
  { lng: 67.74, lat: 31.28 },
].map((c, i) => ({
  title: `SmartZoom User Test Point ${i + 1}`,
  geometryType: 'point',
  latitude: c.lat,
  longitude: c.lng,
  severity: 2,
  startDate: new Date().toISOString(),
}));
const POINT_A = { lng: 67.70, lat: 31.20 };
const TINY_ZONE_BODY = {
  title: 'SmartZoom User Test Tiny Zone',
  geometryType: 'polygon',
  geometry: { type: 'Polygon', coordinates: [squareRing(67.7, 31.2, 0.005)] }, // ~1 km diag
  severity: 2,
  startDate: new Date().toISOString(),
};
// Trans-regional zone for the ZONE_MIN_ZOOM (2.5) clamp + containment check:
// 40°E→75°E, 10°N→35°N, diagonal >3000 km.
const HUGE_ZONE_BODY = {
  title: 'SmartZoom User Test Huge Zone',
  geometryType: 'polygon',
  geometry: {
    type: 'Polygon',
    coordinates: [[[40, 10], [75, 10], [75, 35], [40, 35], [40, 10]]],
  },
  severity: 2,
  startDate: new Date().toISOString(),
};
const HUGE_BBOX = { minLng: 40, minLat: 10, maxLng: 75, maxLat: 35 };

const ZOOM_TOL = 0.3;

const results = [];
const consoleErrors = [];

function check(name, ok, detail = '') {
  results.push({ name, ok, detail });
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ` — ${detail}` : ''}`);
}

async function apiFetch(token, path, options = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', ...(options.headers || {}) },
  });
  const body = await res.json();
  if (!body.success) throw new Error(`API ${path} failed: ${body.message || res.status}`);
  return body.data;
}

async function main() {
  // ─── Login via API (fixtures only — user-web itself needs no auth) ───
  let token = null;
  for (let attempt = 1; attempt <= 2 && !token; attempt++) {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'admin@geowatch.local', password: 'AdminPass123!' }),
    });
    if (res.status === 429 && attempt === 1) {
      console.log('Rate limited — waiting 60s before retry…');
      await new Promise((r) => setTimeout(r, 60000));
      continue;
    }
    const body = await res.json();
    if (body.success && body.data?.token) token = body.data.token;
  }
  if (!token) {
    check('login (API token)', false, 'could not obtain token');
    process.exit(1);
  }
  check('login (API token)', true);

  // ─── Fixtures ───
  const pointIds = [];
  for (const body of POINT_FIXTURES) {
    const created = (await apiFetch(token, '/incidents', { method: 'POST', body: JSON.stringify(body) })).incident;
    pointIds.push(created.id);
  }
  const tinyZoneId = (await apiFetch(token, '/incidents', {
    method: 'POST', body: JSON.stringify(TINY_ZONE_BODY),
  })).incident.id;
  const hugeZoneId = (await apiFetch(token, '/incidents', {
    method: 'POST', body: JSON.stringify(HUGE_ZONE_BODY),
  })).incident.id;
  check('fixtures created via API (4 points + tiny/huge zones)', pointIds.length === 4 && !!tinyZoneId && !!hugeZoneId,
    `points=${pointIds.length} tiny=${tinyZoneId} huge=${hugeZoneId}`);

  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: VIEWPORT });

  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      consoleErrors.push(msg.text());
      console.log('[console error]', msg.text());
    }
  });
  page.on('pageerror', (err) => {
    consoleErrors.push(`pageerror: ${err.message}`);
    console.error('[page error]', err.message);
  });

  const freshMapPage = async () => {
    // NOTE: SSE keeps a connection open, so 'networkidle' never fires — use domcontentloaded.
    await page.goto(`${USER_BASE}/map`, { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('.maplibregl-canvas', { timeout: 20000 });
    await page.waitForFunction(() => !!window.__geowatchUserMap, { timeout: 20000 });
    await page.waitForTimeout(3000); // incidents fetch + markers render
  };

  await freshMapPage();
  check('map loaded with dev debug handle', true);

  const getZoom = () => page.evaluate(() => window.__geowatchUserMap.getZoom());
  const getCenter = () => page.evaluate(() => {
    const c = window.__geowatchUserMap.getCenter();
    return { lng: c.lng, lat: c.lat };
  });
  const jumpTo = (zoom, center) => page.evaluate(
    ([z, c]) => window.__geowatchUserMap.jumpTo({ zoom: z, ...(c ? { center: c } : {}) }),
    [zoom, center]
  );

  // ─── 1. z3 + drawer incident → zoom ≈ 6 (list floor) ───
  await jumpTo(3, [POINT_A.lng, POINT_A.lat]);
  await page.waitForTimeout(400);
  await page.click('button[title="Incidents"]');
  await page.waitForSelector('text=Incidents in Viewport', { timeout: 5000 });
  await page.waitForTimeout(500);
  const drawer = page.locator('div', { has: page.getByText('Incidents in Viewport', { exact: true }) }).last().locator('xpath=..');
  // IncidentCard roots are the only cursor:pointer divs inside the drawer.
  const drawerCards = drawer.locator('div[style*="cursor: pointer"]');
  const drawerCardCount = await drawerCards.count();
  if (drawerCardCount < 2) {
    check('drawer lists ≥2 incident cards', false, `found ${drawerCardCount}`);
    await browser.close();
    process.exit(1);
  }
  check('drawer lists ≥2 incident cards', true, `found ${drawerCardCount}`);
  await drawerCards.nth(0).click();
  await page.waitForTimeout(2500);
  let zoom = await getZoom();
  check('z3 + drawer incident → zoom ≈ 6', Math.abs(zoom - 6) <= ZOOM_TOL, `zoom=${zoom.toFixed(2)}`);

  // ─── 2. z9 + another drawer incident → zoom stays ≈ 9 (never zooms out) ───
  await jumpTo(9);
  await page.waitForTimeout(400);
  await drawerCards.nth(1).click();
  await page.waitForTimeout(2000);
  zoom = await getZoom();
  check('z9 + drawer incident → zoom stays ≈ 9 (no zoom-out)', Math.abs(zoom - 9) <= ZOOM_TOL, `zoom=${zoom.toFixed(2)}`);

  // ─── 3. Repeat-click guard: same drawer incident again → no re-flight ───
  const zoomBefore = await getZoom();
  const centerBefore = await getCenter();
  await drawerCards.nth(1).click();
  await page.waitForTimeout(1500);
  const zoomAfter = await getZoom();
  const centerAfter = await getCenter();
  const centerDrift = Math.hypot(centerAfter.lng - centerBefore.lng, centerAfter.lat - centerBefore.lat);
  check('repeat click same incident → zoom/center unchanged',
    Math.abs(zoomAfter - zoomBefore) <= 0.05 && centerDrift <= 0.005,
    `zoom ${zoomBefore.toFixed(2)}→${zoomAfter.toFixed(2)}, drift=${centerDrift.toFixed(5)}°`);

  // ─── 4. Power Search: z9 stability + z4 floor ───
  await page.keyboard.press('Escape'); // close drawer (hidden in PS mode anyway)
  await page.waitForTimeout(300);
  await page.click('button[title="Open advanced search page"]');
  await page.waitForSelector('input[placeholder="Search incidents…"]', { timeout: 8000 });
  await page.waitForTimeout(1500);
  await page.fill('input[placeholder="Search incidents…"]', 'SmartZoom User Test Point');
  await page.waitForTimeout(1800);

  const rail = page.locator('button[title="Hide results"]').locator('xpath=../../..');
  // Result card roots: cursor:pointer divs inside the rail's scroll area.
  const railCards = rail.locator('div[style*="overflow-y: auto"] div[style*="cursor: pointer"]');
  const psCount = await railCards.count();
  if (psCount < 4) {
    check('power search fixtures (≥4 "SmartZoom User Test Point" results)', false, `found ${psCount}`);
  } else {
    check('power search fixtures (≥4 "SmartZoom User Test Point" results)', true, `found ${psCount}`);
    await jumpTo(9);
    await page.waitForTimeout(400);
    let psOk = true;
    const seen = [];
    for (let i = 0; i < 3; i++) {
      await railCards.nth(i).click();
      await page.waitForTimeout(1800);
      zoom = await getZoom();
      seen.push(zoom.toFixed(2));
      if (Math.abs(zoom - 9) > ZOOM_TOL) psOk = false;
    }
    check('z9 + 3 power-search results → zoom stays ≈ 9 each time', psOk, `zooms=${seen.join(', ')}`);

    await jumpTo(4);
    await page.waitForTimeout(400);
    await railCards.nth(3).click();
    await page.waitForTimeout(1800);
    zoom = await getZoom();
    check('z4 + power-search result → zoom ≈ 6 (floor)', Math.abs(zoom - 6) <= ZOOM_TOL, `zoom=${zoom.toFixed(2)}`);
  }
  await page.click('button[title="Back to workspace"]'); // close power search
  await page.waitForTimeout(600);

  // ─── 5. Tiny zone deep-link → comfort-fit capped at 11 ───
  await page.goto(`${USER_BASE}/map?zone=${tinyZoneId}`, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('.maplibregl-canvas', { timeout: 20000 });
  await page.waitForFunction(() => !!window.__geowatchUserMap, { timeout: 20000 });
  await page.waitForTimeout(6000); // incidents load + deep-link fit flight
  zoom = await getZoom();
  check('tiny zone (~1.5 km) → zoom ≤ 11.3 (size cap 11)', zoom <= 11.3, `zoom=${zoom.toFixed(2)}`);

  // ─── 6. Huge trans-regional zone (>3000 km) → fully contained, zoom ≥ 2.4 ───
  await page.goto(`${USER_BASE}/map?zone=${hugeZoneId}`, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('.maplibregl-canvas', { timeout: 20000 });
  await page.waitForFunction(() => !!window.__geowatchUserMap, { timeout: 20000 });
  await page.waitForTimeout(6000);
  zoom = await getZoom();
  const hugeFits = await page.evaluate((bb) => {
    const EPS = 0.5; // degrees of slack for viewport edge rounding
    const b = window.__geowatchUserMap.getBounds();
    return {
      fits: bb.minLng >= b.getWest() - EPS && bb.maxLng <= b.getEast() + EPS &&
            bb.minLat >= b.getSouth() - EPS && bb.maxLat <= b.getNorth() + EPS,
      bounds: [b.getWest(), b.getSouth(), b.getEast(), b.getNorth()],
    };
  }, HUGE_BBOX);
  check('huge zone (>3000 km) → zoom ≥ 2.4 (not clipped by min-zoom clamp)', zoom >= 2.4, `zoom=${zoom.toFixed(2)}`);
  check('huge zone bbox fully inside map bounds (no clipping)', hugeFits.fits,
    `map=${hugeFits.bounds.map((v) => v.toFixed(1)).join(',')} zone=40,10,75,35`);
  await page.screenshot({ path: join(OUT, 'huge-zone-fit.png') });

  // ─── 7. z3 + marker click on map → zoom ≈ 6 ───
  await freshMapPage();
  await jumpTo(3, [POINT_A.lng, POINT_A.lat]);
  await page.waitForTimeout(1200);
  const markerCount = await page.locator('.maplibregl-marker').count();
  if (markerCount === 0) {
    check('z3 + map marker click → zoom ≈ 6', false, 'SKIPPED — no markers in view');
  } else {
    // Click the marker closest to the viewport center.
    const markerBox = await page.evaluate(() => {
      const cx = window.innerWidth / 2, cy = window.innerHeight / 2;
      let best = null;
      document.querySelectorAll('.maplibregl-marker').forEach((m) => {
        const r = m.getBoundingClientRect();
        if (r.width === 0 && r.height === 0 && (r.x === 0 && r.y === 0)) return;
        const d = Math.hypot(r.x + r.width / 2 - cx, r.y + r.height / 2 - cy);
        if (!best || d < best.d) best = { d, x: r.x + r.width / 2, y: r.y + r.height / 2 };
      });
      return best;
    });
    if (!markerBox) {
      check('z3 + map marker click → zoom ≈ 6', false, 'no clickable marker box found');
    } else {
      await page.mouse.click(markerBox.x, markerBox.y);
      await page.waitForTimeout(1800);
      zoom = await getZoom();
      check('z3 + map marker click → zoom ≈ 6', Math.abs(zoom - 6) <= ZOOM_TOL, `zoom=${zoom.toFixed(2)}`);
    }
  }
  await page.screenshot({ path: join(OUT, 'final-state.png') });

  // ─── 8. Stutter instrumentation: incident click never touches padding;
  // same-zoom pan uses easeTo (no flyTo zoom-out arc) ───
  await page.evaluate(() => {
    const m = window.__geowatchUserMap;
    window.__cam = { setPadding: 0, flyTo: 0, easeTo: 0 };
    const osp = m.setPadding.bind(m);
    m.setPadding = (p) => { window.__cam.setPadding += 1; return osp(p); };
    const ofly = m.flyTo.bind(m);
    m.flyTo = (o) => { window.__cam.flyTo += 1; return ofly(o); };
    const oet = m.easeTo.bind(m);
    m.easeTo = (o) => { window.__cam.easeTo += 1; return oet(o); };
  });
  await jumpTo(7, [POINT_A.lng, POINT_A.lat]);
  await page.waitForTimeout(500);
  await page.click('button[title="Incidents"]');
  await page.waitForSelector('text=Incidents in Viewport', { timeout: 5000 });
  await page.waitForTimeout(600);
  await drawerCards.nth(0).click(); // 'list' → max(7, 6) = 7 = currentZoom → pan only
  await page.waitForTimeout(1800);
  const camStats = await page.evaluate(() => window.__cam);
  check('incident same-zoom pan: setPadding ×0, exactly 1 move and it is easeTo',
    camStats.setPadding === 0 && camStats.flyTo === 0 && camStats.easeTo === 1,
    JSON.stringify(camStats));
  await page.keyboard.press('Escape'); // close drawer
  await page.waitForTimeout(300);

  // ─── Summary ───
  console.log('\n================ SUMMARY ================');
  const failed = results.filter((r) => !r.ok);
  console.log(`${results.length - failed.length}/${results.length} checks passed`);
  if (consoleErrors.length > 0) {
    console.log(`\n${consoleErrors.length} console/page errors:`);
    for (const e of [...new Set(consoleErrors)]) console.log('  -', e);
  } else {
    console.log('\nNo console/page errors captured.');
  }

  // ─── Cleanup: soft-delete the fixtures ───
  for (const id of [...pointIds, tinyZoneId, hugeZoneId]) {
    try {
      await apiFetch(token, `/incidents/${id}`, { method: 'DELETE' });
      console.log(`Cleaned up fixture ${id}`);
    } catch (err) {
      console.warn(`Cleanup failed for ${id}: ${err.message}`);
    }
  }

  await browser.close();
  process.exit(failed.length > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
