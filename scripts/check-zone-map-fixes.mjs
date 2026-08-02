import { chromium } from 'playwright';

/**
 * check-zone-map-fixes.mjs — verifies the four zone fixes on user-web /map:
 *  (2) zones visible by default on load
 *  (1) zone click opens the sidebar (canvas-verified hit at a fixture centroid)
 *  (3) sidebar "Full details" navigates to /zone/:id
 *  (4) Back restores historic date range + reopens the zone panel
 */
const API_BASE = 'http://localhost:3100/api/v1';
const USER_BASE = 'http://localhost:5173';
let passed = 0, failed = 0;
const check = (name, ok, detail = '') => {
  ok ? passed++ : failed++;
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ` — ${detail}` : ''}`);
};
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const ring = (cx, cy, h) => [
  [cx - h, cy - h], [cx + h, cy - h], [cx + h, cy + h], [cx - h, cy + h], [cx - h, cy - h],
];

const login = await fetch(`${API_BASE}/auth/login`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email: 'admin@geowatch.local', password: 'AdminPass123!' }),
}).then((r) => r.json());
const token = login.data.token;

const created = await fetch(`${API_BASE}/incidents`, {
  method: 'POST',
  headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
  body: JSON.stringify({
    title: 'ZoneFix Verify Zone',
    geometryType: 'polygon',
    geometry: { type: 'Polygon', coordinates: [ring(55, 20, 0.25)] },
    zoneCategoryId: 6,
    severity: 2,
    startDate: new Date().toISOString(),
  }),
}).then((r) => r.json());
const zoneId = created.data.incident.id;
check('fixture zone created via API', !!zoneId, zoneId);

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
page.on('pageerror', (e) => console.log('[pageerror]', e.message));

await page.goto(`${USER_BASE}/map`, { waitUntil: 'domcontentloaded' });
await page.waitForFunction(() => !!window.__geowatchUserMap, { timeout: 20000 });
await sleep(3500);

// ─── Bug 2: zones visible by default (no drawer interaction) ───
const defaultVisible = await page.evaluate((zid) => {
  const m = window.__geowatchUserMap;
  const data = m.getSource('zones')?._data;
  const ids = (data?.features || []).map((f) => String(f.id));
  return { count: ids.length, hasFixture: ids.includes(zid) };
}, zoneId);
check('zones visible by default on load (hit source populated)', defaultVisible.count > 0 && defaultVisible.hasFixture,
  `${defaultVisible.count} features, fixture=${defaultVisible.hasFixture}`);

// ─── Bug 1: zone click opens the sidebar ───
// Historic range first (also the Bug 4 context): pick "Last 30 days"
await page.locator('.tbd-trigger').click();
await page.waitForSelector('.tbd-panel', { timeout: 5000 });
await page.locator('.tbd-panel .tui-date-preset:has-text("Last 30 days")').first().click();
await sleep(2500);

await page.evaluate(() => window.__geowatchUserMap.jumpTo({ zoom: 7.5, center: [55, 20] }));
await sleep(800);
const clickPt = await page.evaluate(([zx, zy, zid]) => {
  const m = window.__geowatchUserMap;
  const pt = m.project([zx, zy]);
  const canvas = m.getCanvas().getBoundingClientRect();
  const x = canvas.x + pt.x, y = canvas.y + pt.y;
  const el = document.elementFromPoint(x, y);
  let rendered = [];
  try { rendered = m.queryRenderedFeatures(pt, { layers: ['zone-hit'] }); } catch {}
  return {
    x, y,
    isCanvas: !!el && el.tagName === 'CANVAS',
    hasZone: rendered.some((f) => String(f.id) === zid),
    // no duplicate feature ids (dedupe check)
    dupes: rendered.length !== new Set(rendered.map((f) => String(f.id))).size,
  };
}, [55, 20, zoneId]);
check('zone hit-test finds the fixture zone at its centroid', clickPt.isCanvas && clickPt.hasZone,
  `canvas=${clickPt.isCanvas} hasZone=${clickPt.hasZone} dupes=${clickPt.dupes}`);
check('no duplicated zone features in hit source', !clickPt.dupes);
if (clickPt.isCanvas) await page.mouse.click(clickPt.x, clickPt.y);
await sleep(2500);
const selectedZone = new URL(page.url()).searchParams.get('zone');
check('zone click selects the zone (sidebar opens)', selectedZone === zoneId, `zone=${selectedZone}`);

// ─── Bug 3: Full details navigates to /zone/:id ───
const fullDetails = page.locator('button:has-text("Full details")').first();
check('zone sidebar shows Full details', await fullDetails.isVisible().catch(() => false));
await fullDetails.click();
await sleep(2500);
check('Full details navigates to /zone/:id', page.url().includes(`/zone/${zoneId}`), page.url());
await page.waitForSelector('button.opt1-back-link', { timeout: 10000 });

// ─── Bug 4: Back restores historic range + reopens the zone panel ───
await page.locator('button.opt1-back-link').first().click();
await page.waitForFunction(() => !!window.__geowatchUserMap, { timeout: 15000 });
await sleep(3500);

const pillClass = await page.locator('.tbm').getAttribute('class');
check('Back: mode pill is HISTORIC (not LIVE)', (pillClass || '').includes('tbm-historic'), pillClass);
const triggerText = (await page.locator('.tbd-trigger').textContent()) || '';
check('Back: date trigger still "Last 30 days"', /Last 30 days|30 days/.test(triggerText), triggerText.trim());

let panelOk = false;
let finalZone = null;
for (let i = 0; i < 10 && !panelOk; i++) {
  await sleep(700);
  finalZone = new URL(page.url()).searchParams.get('zone');
  panelOk = finalZone === zoneId && (await page.locator('button:has-text("Full details")').first().isVisible().catch(() => false));
}
check('Back: zone panel re-opened on the same zone', panelOk, `zone=${finalZone}`);

await fetch(`${API_BASE}/incidents/${zoneId}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
console.log(`\n${passed} passed, ${failed} failed`);
await browser.close();
process.exit(failed > 0 ? 1 : 0);
