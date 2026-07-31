import { chromium } from 'playwright';
import { existsSync, mkdirSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const OUT = join(ROOT, 'temp_screenshots', 'smart-zoom-superadmin');

if (!existsSync(OUT)) mkdirSync(OUT, { recursive: true });

const SUPERADMIN_BASE = 'http://localhost:5175';
const MAP_URL = `${SUPERADMIN_BASE}/superadmin/map`;
// Overridable for runs where the default port is occupied (e.g. start the
// backend with PORT=3101 and pass API_BASE).
const API_BASE = process.env.API_BASE || 'http://localhost:3100/api/v1';
const VIEWPORT = { width: 1440, height: 900 };

// Test fixtures: polygon zones are created via the API (tiny <2 km diagonal →
// size cap 11; medium ~95 km → chrome-fit checks; huge >3000 km → min-zoom
// clamp + containment) and soft-deleted at the end. Centered inside HOT_BBOX
// so the maxZoom clamp doesn't confound the tiny-zone cap assertion.
function squareRing(cx, cy, half) {
  return [
    [cx - half, cy - half],
    [cx + half, cy - half],
    [cx + half, cy + half],
    [cx - half, cy + half],
    [cx - half, cy - half],
  ];
}
const TINY_ZONE_BODY = {
  title: 'SmartZoom Test Tiny Zone',
  geometryType: 'polygon',
  geometry: { type: 'Polygon', coordinates: [squareRing(67.7, 31.2, 0.005)] }, // ~1 km diag
  severity: 2,
  startDate: new Date().toISOString(),
};
const MEDIUM_ZONE_BODY = {
  title: 'SmartZoom Test Fit Zone',
  geometryType: 'polygon',
  geometry: { type: 'Polygon', coordinates: [squareRing(67.7, 31.2, 0.5)] }, // ~95 km diag
  severity: 2,
  startDate: new Date().toISOString(),
};
// Trans-regional zone for the ZONE_MIN_ZOOM (2.5) clamp check: 40°E→75°E,
// 10°N→35°N, diagonal >3000 km.
const HUGE_ZONE_BODY = {
  title: 'SmartZoom Test Huge Zone',
  geometryType: 'polygon',
  geometry: {
    type: 'Polygon',
    coordinates: [[[40, 10], [75, 10], [75, 35], [40, 35], [40, 10]]],
  },
  severity: 2,
  startDate: new Date().toISOString(),
};
// Medium zone geometry constants for map-click + rect assertions.
const MED_CENTER = [67.7, 31.2];
const MED_BBOX = { minLng: 67.2, minLat: 30.7, maxLng: 68.2, maxLat: 31.7 };
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
  // ─── Single login via API; token is injected into localStorage ───
  let token = null;
  let staffUserId = null;
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
    if (body.success && body.data?.token) {
      token = body.data.token;
      staffUserId = body.data.user?.id || null;
    }
  }
  if (!token) {
    check('login (API token)', false, 'could not obtain token');
    process.exit(1);
  }
  check('login (API token)', true, staffUserId ? `staffUserId=${staffUserId}` : 'no user id');

  // ─── Test data from the API ───
  const now = new Date();
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  const listData = await apiFetch(token, `/incidents?dateFrom=${today}&dateTo=${today}&limit=500`);
  const pointIncidents = (listData.incidents || []).filter(
    (i) => i.geometry_type !== 'polygon' && i.latitude != null && i.longitude != null
  );
  // Dev DB today: several incidents all titled "Fire" — distinct cards (distinct
  // coordinates → distinct repeat-guard signatures), clicked by index.
  const fireIncidents = pointIncidents.filter((i) => i.title === 'Fire');
  const incA = fireIncidents[0] || pointIncidents[0];
  if (fireIncidents.length < 2 || !incA) {
    check('fixture: ≥2 "Fire" point incidents today', false,
      `found ${fireIncidents.length} (of ${pointIncidents.length} points)`);
    process.exit(1);
  }
  check('fixture: ≥2 "Fire" point incidents today', true, `${fireIncidents.length} "Fire" incidents`);

  // ─── Zone fixtures (created via API, soft-deleted at the end) ───
  // Fixtures must carry a zoneCategoryId: the map's zone-category visibility
  // filter hides uncategorized zones, which would make them unclickable.
  const zoneCats = await apiFetch(token, '/zone-categories');
  const zoneCategoryId = (Array.isArray(zoneCats) ? zoneCats : zoneCats?.categories || [])[0]?.id;
  if (!zoneCategoryId) {
    check('zone category fixture lookup', false, 'no zone categories returned');
    process.exit(1);
  }
  const withCat = (body) => JSON.stringify({ ...body, zoneCategoryId });
  const tinyZoneData = (await apiFetch(token, '/incidents', {
    method: 'POST', body: withCat(TINY_ZONE_BODY),
  })).incident;
  const mediumZoneData = (await apiFetch(token, '/incidents', {
    method: 'POST', body: withCat(MEDIUM_ZONE_BODY),
  })).incident;
  const hugeZoneData = (await apiFetch(token, '/incidents', {
    method: 'POST', body: withCat(HUGE_ZONE_BODY),
  })).incident;
  const TINY_ZONE_ID = tinyZoneData.id;
  const MEDIUM_ZONE_ID = mediumZoneData.id;
  const HUGE_ZONE_ID = hugeZoneData.id;
  check('zone fixtures created via API', !!(TINY_ZONE_ID && MEDIUM_ZONE_ID && HUGE_ZONE_ID),
    `tiny=${TINY_ZONE_ID} medium=${MEDIUM_ZONE_ID} huge=${HUGE_ZONE_ID}`);

  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: VIEWPORT });
  page.setDefaultNavigationTimeout(60000); // vite dev-server recompiles can be slow under load

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

  await page.addInitScript((t) => localStorage.setItem('superadmin_token', t), token);

  // NOTE: SSE keeps a connection open, so 'networkidle' never fires — use domcontentloaded.
  await page.goto(MAP_URL, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('.maplibregl-canvas', { timeout: 20000 });
  await page.waitForFunction(() => !!window.__geowatchSuperadminMap, { timeout: 20000 });
  await page.waitForTimeout(3000); // incidents fetch + markers render
  check('map loaded with dev debug handle', true);

  const getZoom = () => page.evaluate(() => window.__geowatchSuperadminMap.getZoom());
  const getCenter = () => page.evaluate(() => {
    const c = window.__geowatchSuperadminMap.getCenter();
    return { lng: c.lng, lat: c.lat };
  });
  const jumpTo = (zoom, center) => page.evaluate(
    ([z, c]) => window.__geowatchSuperadminMap.jumpTo({ zoom: z, ...(c ? { center: c } : {}) }),
    [zoom, center]
  );

  // ─── 1. z3 + drawer incident → zoom ≈ 6 (list floor) ───
  await jumpTo(3, [parseFloat(incA.longitude), parseFloat(incA.latitude)]);
  await page.waitForTimeout(400);
  await page.click('button[title="Incidents"]');
  await page.waitForSelector('text=Incidents in Viewport', { timeout: 5000 });
  await page.waitForTimeout(500);
  const drawer = page.locator('div', { has: page.getByText('Incidents in Viewport', { exact: true }) }).last().locator('xpath=..');
  // IncidentCard roots are cursor:pointer divs inside the drawer. Filter to
  // "Fire" cards so polygon zone fixtures (which also appear in the drawer)
  // are never clicked by these point-incident zoom checks.
  const drawerCards = drawer.locator('div[style*="cursor: pointer"]').filter({ hasText: 'Fire' });
  const drawerCardCount = await drawerCards.count();
  if (drawerCardCount < 2) {
    check('drawer lists ≥2 incident cards', false, `found ${drawerCardCount}`);
    await browser.close();
    process.exit(1);
  }
  await drawerCards.nth(0).click();
  await page.waitForTimeout(2500);
  let zoom = await getZoom();
  check('z3 + drawer incident → zoom ≈ 6', Math.abs(zoom - 6) <= ZOOM_TOL, `zoom=${zoom.toFixed(2)}`);

  // ─── 2. z9 + another drawer incident → zoom stays ≈ 9 (no zoom-out) ───
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

  // ─── 4. Power Search at z9: results keep zoom; at z4: floor to 6 ───
  await page.keyboard.press('Escape'); // close drawer (defensive; hidden in PS mode anyway)
  await page.waitForTimeout(300);
  await page.click('button[title="Open advanced search page"]');
  await page.waitForSelector('input[placeholder="Search incidents…"]', { timeout: 8000 });
  await page.waitForTimeout(1500);
  await page.fill('input[placeholder="Search incidents…"]', 'Fire');
  await page.waitForTimeout(1500);

  const rail = page.locator('button[title="Hide results"]').locator('xpath=../../..');
  // Result card roots: cursor:pointer divs inside the rail's scroll area.
  const railCards = rail.locator('div[style*="overflow-y: auto"] div[style*="cursor: pointer"]');
  const fireCount = await railCards.count();
  if (fireCount < 4) {
    check('power search fixtures (≥4 "Fire" results)', false, `found ${fireCount}`);
  } else {
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
  await page.keyboard.press('Escape'); // close power search
  await page.waitForTimeout(600);

  // ─── 5. Tiny zone deep-link → comfort-fit capped at 11 ───
  await page.goto(`${MAP_URL}?zone=${TINY_ZONE_ID}`, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('.maplibregl-canvas', { timeout: 20000 });
  await page.waitForFunction(() => !!window.__geowatchSuperadminMap, { timeout: 20000 });
  await page.waitForTimeout(6000); // incidents load + deep-link fit flight
  zoom = await getZoom();
  check('tiny zone (~1.5 km) → zoom ≤ 11.3 (size cap 11)', zoom <= 11.3, `zoom=${zoom.toFixed(2)}`);

  // ─── 6. Huge trans-regional zone (>3000 km) → fully contained, zoom ≥ 2.4 ───
  await page.goto(`${MAP_URL}?zone=${HUGE_ZONE_ID}`, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('.maplibregl-canvas', { timeout: 20000 });
  await page.waitForFunction(() => !!window.__geowatchSuperadminMap, { timeout: 20000 });
  await page.waitForTimeout(6000);
  zoom = await getZoom();
  const hugeFits = await page.evaluate((bb) => {
    const EPS = 0.5; // degrees of slack for viewport edge rounding
    const b = window.__geowatchSuperadminMap.getBounds();
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
  await jumpTo(3, [parseFloat(incA.longitude), parseFloat(incA.latitude)]);
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

  // ─── 7b. Stutter instrumentation: incident click never touches padding;
  // same-zoom pan uses easeTo (no flyTo zoom-out arc) ───
  await page.evaluate(() => {
    const m = window.__geowatchSuperadminMap;
    window.__cam = { setPadding: 0, flyTo: 0, easeTo: 0 };
    const osp = m.setPadding.bind(m);
    m.setPadding = (p) => { window.__cam.setPadding += 1; return osp(p); };
    const ofly = m.flyTo.bind(m);
    m.flyTo = (o) => { window.__cam.flyTo += 1; return ofly(o); };
    const oet = m.easeTo.bind(m);
    m.easeTo = (o) => { window.__cam.easeTo += 1; return oet(o); };
  });
  await jumpTo(7, [parseFloat(incA.longitude), parseFloat(incA.latitude)]);
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

  // ─── Zone-fit chrome checks (medium ~95 km zone) ───
  // Each group starts from a FRESH page load so no stale flight/popup/camera
  // state can poison the projected click point.
  const freshMapPage = async (pg) => {
    await pg.goto(MAP_URL, { waitUntil: 'domcontentloaded' });
    await pg.waitForSelector('.maplibregl-canvas', { timeout: 20000 });
    await pg.waitForFunction(() => !!window.__geowatchSuperadminMap, { timeout: 20000 });
    await pg.waitForTimeout(3000);
  };
  // Click the zone fill at a marker-free NW offset; verify the click point is
  // actually on the map canvas (not a drawer card / panel) before clicking.
  const clickZoneFill = async (pg) => {
    const pt = await pg.evaluate(([cx, cy]) => {
      const p = window.__geowatchSuperadminMap.project([cx, cy]);
      const canvas = window.__geowatchSuperadminMap.getCanvas().getBoundingClientRect();
      return { x: canvas.x + p.x, y: canvas.y + p.y };
    }, [MED_CENTER[0] - 0.25, MED_CENTER[1] + 0.25]);
    const target = await pg.evaluate(([x, y]) => {
      const el = document.elementFromPoint(x, y);
      return { isCanvas: !!el && el.tagName === 'CANVAS', tag: el?.tagName, text: (el?.textContent || '').slice(0, 30) };
    }, [pt.x, pt.y]);
    if (!target.isCanvas) {
      return { clicked: false, reason: `click point covered by ${target.tag} "${target.text}"` };
    }
    await pg.mouse.click(pt.x, pt.y);
    return { clicked: true };
  };
  const zoneRect = (pg) => pg.evaluate((bb) => {
    const m = window.__geowatchSuperadminMap;
    const sw = m.project([bb.minLng, bb.minLat]);
    const ne = m.project([bb.maxLng, bb.maxLat]);
    const canvas = m.getCanvas().getBoundingClientRect();
    return {
      x0: canvas.x + sw.x, y0: canvas.y + ne.y, x1: canvas.x + ne.x, y1: canvas.y + sw.y,
      canvasX: canvas.x, canvasY: canvas.y, canvasW: canvas.width, canvasH: canvas.height,
      zoom: m.getZoom(),
    };
  }, MED_BBOX);
  const RECT_TOL = 8;
  const rectInside = (r, left, top, right, bottom) =>
    r.x0 >= left - RECT_TOL && r.x1 <= right + RECT_TOL && r.y0 >= top - RECT_TOL && r.y1 <= bottom + RECT_TOL;

  // ─── 8. 1440: drawer OPEN + zone map click → fits inside padded rect ───
  await freshMapPage(page);
  await jumpTo(7, MED_CENTER);
  await page.waitForTimeout(500);
  await page.click('button[title="Incidents"]');
  await page.waitForSelector('text=Incidents in Viewport', { timeout: 5000 });
  await page.waitForTimeout(600);
  const clickRes8 = await clickZoneFill(page);
  await page.waitForTimeout(2500);
  const urlHasZone8 = page.url().includes('zone=');
  let rect = await zoneRect(page);
  {
    const left = rect.canvasX + 360;
    const right = rect.canvasX + rect.canvasW - 630;
    const ok = clickRes8.clicked && urlHasZone8 &&
      rectInside(rect, left, rect.canvasY, right, rect.canvasY + rect.canvasH) && rect.zoom <= 14.3;
    check('1440 drawer OPEN + zone click → fits inside drawer/panel-padded rect', ok,
      `clicked=${clickRes8.clicked}${clickRes8.reason ? ` (${clickRes8.reason})` : ''} urlZone=${urlHasZone8} zoom=${rect.zoom.toFixed(2)} zone x[${Math.round(rect.x0)},${Math.round(rect.x1)}] y[${Math.round(rect.y0)},${Math.round(rect.y1)}] visible x[${Math.round(left)},${Math.round(right)}]`);
  }
  await page.screenshot({ path: join(OUT, 'zone-fit-drawer-open-1440.png') });

  // ─── 9. Power Search + zone result → fits inside PS rails + topbar/chips rect ───
  await freshMapPage(page);
  await page.click('button[title="Open advanced search page"]');
  await page.waitForSelector('input[placeholder="Search incidents…"]', { timeout: 8000 });
  await page.fill('input[placeholder="Search incidents…"]', 'SmartZoom Test Fit Zone');
  await page.waitForTimeout(1800);
  const psZoneRail = page.locator('button[title="Hide results"]').locator('xpath=../../..');
  const psZoneCards = psZoneRail.locator('div[style*="overflow-y: auto"] div[style*="cursor: pointer"]');
  const psZoneCount = await psZoneCards.count();
  await jumpTo(7, MED_CENTER);
  await page.waitForTimeout(500);
  if (psZoneCount > 0) await psZoneCards.nth(0).click();
  await page.waitForTimeout(2500);
  const psPanelHasZone = await page.getByText('SmartZoom Test Fit Zone', { exact: false }).first().isVisible().catch(() => false);
  rect = await zoneRect(page);
  {
    const ok = psZoneCount > 0 && psPanelHasZone &&
      rectInside(rect, 560, 90, 1440 - 630, 900) && rect.zoom <= 14.3;
    check('power search + zone result → fits inside rails/topbar/panel-padded rect', ok,
      `cards=${psZoneCount} panelZone=${psPanelHasZone} zoom=${rect.zoom.toFixed(2)} zone x[${Math.round(rect.x0)},${Math.round(rect.x1)}] y[${Math.round(rect.y0)},${Math.round(rect.y1)}] visible x[560,810] y[90,900]`);
  }
  await page.screenshot({ path: join(OUT, 'zone-fit-power-search.png') });
  await page.keyboard.press('Escape');
  await page.waitForTimeout(500);

  // ─── 10/11. 1280×800 page: drawer-open fit + re-click re-fit after drawer close ───
  const page2 = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  page2.setDefaultNavigationTimeout(60000);
  page2.on('console', (msg) => {
    if (msg.type() === 'error') {
      consoleErrors.push(msg.text());
      console.log('[console error]', msg.text());
    }
  });
  page2.on('pageerror', (err) => {
    consoleErrors.push(`pageerror: ${err.message}`);
    console.error('[page error]', err.message);
  });
  await page2.addInitScript((t) => localStorage.setItem('superadmin_token', t), token);
  await freshMapPage(page2);
  await page2.evaluate(() => {
    const m = window.__geowatchSuperadminMap;
    window.__flyCount = 0;
    const ofly = m.flyTo.bind(m);
    m.flyTo = (opts) => { window.__flyCount += 1; return ofly(opts); };
    const oet = m.easeTo.bind(m);
    m.easeTo = (opts) => { window.__flyCount += 1; return oet(opts); };
  });
  await page2.evaluate(([z, c]) => window.__geowatchSuperadminMap.jumpTo({ zoom: z, center: c }), [7, MED_CENTER]);
  await page2.waitForTimeout(500);
  await page2.click('button[title="Incidents"]');
  await page2.waitForSelector('text=Incidents in Viewport', { timeout: 5000 });
  await page2.waitForTimeout(600);
  const clickRes10 = await clickZoneFill(page2);
  await page2.waitForTimeout(2500);
  const urlHasZone10 = page2.url().includes('zone=');
  rect = await zoneRect(page2);
  const zoom1280a = rect.zoom;
  {
    const ok = clickRes10.clicked && urlHasZone10 &&
      rectInside(rect, 64 + 360, rect.canvasY, 1280 - 630, rect.canvasY + rect.canvasH) && rect.zoom <= 14.3;
    check('1280 drawer OPEN + zone click → fits inside padded rect', ok,
      `clicked=${clickRes10.clicked} urlZone=${urlHasZone10} zoom=${rect.zoom.toFixed(2)} zone x[${Math.round(rect.x0)},${Math.round(rect.x1)}] visible x[424,650]`);
  }
  await page2.screenshot({ path: join(OUT, 'zone-fit-drawer-open-1280.png') });

  // Close the drawer and re-click the SAME zone → a NEW flight must happen
  // (repeat guard sees the padding changed) and the zone re-fits bigger.
  await page2.click('button[title="Incidents"]');
  await page2.waitForTimeout(600);
  await page2.evaluate(() => { window.__flyCount = 0; });
  const reClickPt = { x: rect.x0 + (rect.x1 - rect.x0) * 0.3, y: rect.y0 + (rect.y1 - rect.y0) * 0.3 };
  const reTarget = await page2.evaluate(([x, y]) => {
    const el = document.elementFromPoint(x, y);
    return { isCanvas: !!el && el.tagName === 'CANVAS', tag: el?.tagName, text: (el?.textContent || '').slice(0, 30) };
  }, [reClickPt.x, reClickPt.y]);
  if (reTarget.isCanvas) await page2.mouse.click(reClickPt.x, reClickPt.y);
  await page2.waitForTimeout(2200);
  const flyCount = await page2.evaluate(() => window.__flyCount);
  rect = await zoneRect(page2);
  {
    const refit = reTarget.isCanvas && flyCount >= 1 && rect.zoom > zoom1280a + 0.5;
    const inside = rectInside(rect, 64, rect.canvasY, 1280 - 630, rect.canvasY + rect.canvasH);
    check('drawer closed + re-click SAME zone → new flight + re-fit to new chrome', refit && inside,
      `canvas=${reTarget.isCanvas}${reTarget.isCanvas ? '' : ` (${reTarget.tag} "${reTarget.text}")`} flights=${flyCount} zoom ${zoom1280a.toFixed(2)}→${rect.zoom.toFixed(2)} zone x[${Math.round(rect.x0)},${Math.round(rect.x1)}] visible x[64,650]`);
  }
  await page2.screenshot({ path: join(OUT, 'zone-fit-refit-1280.png') });
  await page2.close();

  // ─── 12. Activity-inspector mode probe: sidebar is a FLEX SIBLING (does not
  // overlay the canvas), so live padding must NOT include it — the deep-link
  // flight must center the incident in the real visible rect (panel-padded). ───
  if (staffUserId) {
    await page.goto(`${MAP_URL}?ref=activity&staffUserId=${staffUserId}&incident=${incA.id}`, { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('.maplibregl-canvas', { timeout: 20000 });
    await page.waitForFunction(() => !!window.__geowatchSuperadminMap, { timeout: 20000 });
    await page.waitForTimeout(6000); // incidents load + deep-link flight (fixed z7)
    const probe = await page.evaluate(([lng, lat]) => {
      const m = window.__geowatchSuperadminMap;
      const canvas = m.getCanvas().getBoundingClientRect();
      // Is the canvas's left strip covered by chrome? (overlay would cover it)
      const el = document.elementFromPoint(canvas.x + 8, canvas.y + canvas.height / 2);
      const pt = m.project([lng, lat]);
      return {
        canvas: { x: canvas.x, y: canvas.y, w: canvas.width, h: canvas.height },
        leftStripCovered: !!el && el.tagName !== 'CANVAS',
        coveredBy: el ? `${el.tagName} ${(el.textContent || '').slice(0, 30)}` : 'none',
        proj: { x: canvas.x + pt.x, y: canvas.y + pt.y },
        zoom: m.getZoom(),
      };
    }, [parseFloat(incA.longitude), parseFloat(incA.latitude)]);
    // Expected: deep-link zoom 7; target centered in the visible rect, which is
    // the canvas minus the 630px right-panel overlay (panel is open).
    const expectedX = probe.canvas.x + (probe.canvas.w - 630) / 2;
    const expectedY = probe.canvas.y + probe.canvas.h / 2;
    const dx = Math.abs(probe.proj.x - expectedX);
    const dy = Math.abs(probe.proj.y - expectedY);
    check('activity mode: inspector sidebar does NOT overlay canvas (flex sibling)',
      !probe.leftStripCovered, probe.leftStripCovered ? `covered by ${probe.coveredBy}` : 'canvas exposed at left edge');
    check('activity mode: deep-link → z7, target centered in panel-padded visible rect (no inspector double-pad)',
      Math.abs(probe.zoom - 7) <= ZOOM_TOL && dx <= 30 && dy <= 30,
      `zoom=${probe.zoom.toFixed(2)} proj=(${Math.round(probe.proj.x)},${Math.round(probe.proj.y)}) expected=(${Math.round(expectedX)},${Math.round(expectedY)}) dx=${Math.round(dx)} dy=${Math.round(dy)}`);
    await page.screenshot({ path: join(OUT, 'activity-mode-deep-link.png') });
  } else {
    check('activity mode probe', false, 'SKIPPED — login response carried no user id');
  }

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

  // ─── Cleanup: soft-delete the zone fixtures ───
  for (const id of [TINY_ZONE_ID, MEDIUM_ZONE_ID, HUGE_ZONE_ID]) {
    try {
      await apiFetch(token, `/incidents/${id}`, { method: 'DELETE' });
      console.log(`Cleaned up zone fixture ${id}`);
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
