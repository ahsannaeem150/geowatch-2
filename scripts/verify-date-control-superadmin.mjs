import { chromium } from 'playwright';

/**
 * verify-date-control-superadmin.mjs — superadmin port of the date-control
 * family checks: TopBarModePill (live ticking clock / amber historic),
 * TopBarDateControl wiring, large-range gating, slim labels.
 * Uses superadmin_token + /superadmin/map + window.__intelmap24SuperadminMap.
 */

const API_BASE = 'http://localhost:3100/api/v1';
const SA_BASE = 'http://localhost:5175';

let passed = 0;
let failed = 0;
function check(name, cond, detail = '') {
  if (cond) {
    passed++;
    console.log(`PASS  ${name}${detail ? ` — ${detail}` : ''}`);
  } else {
    failed++;
    console.log(`FAIL  ${name}${detail ? ` — ${detail}` : ''}`);
  }
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const MMM = (d) => d.toLocaleString('en-US', { month: 'short' }).toUpperCase();

async function main() {
  // ─── One login via API (superadmin role); token injected into localStorage ───
  const res = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'admin@geowatch.local', password: 'AdminPass123!' }),
  });
  const json = await res.json();
  const token = json?.data?.token;
  if (!token) {
    check('login (API token)', false, JSON.stringify(json).slice(0, 120));
    process.exit(1);
  }
  check('login (API token)', true);

  const browser = await chromium.launch({ headless: true });
  // 1920px wide → full (non-slim) topbar (superadmin slim breakpoint 1860px)
  const page = await browser.newPage({ viewport: { width: 1920, height: 900 } });

  const incidentRequests = [];
  page.on('request', (req) => {
    const url = req.url();
    if (url.includes('/incidents?')) incidentRequests.push(url);
  });
  const clearRequests = () => { incidentRequests.length = 0; };
  const parsedRequests = () =>
    incidentRequests.map((u) => Object.fromEntries(new URL(u).searchParams.entries()));

  await page.goto(`${SA_BASE}/login`, { waitUntil: 'domcontentloaded' });
  await page.evaluate((t) => localStorage.setItem('superadmin_token', t), token);
  await page.goto(`${SA_BASE}/superadmin/map`, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => !!window.__intelmap24SuperadminMap, { timeout: 25000 });
  await sleep(1800);

  const jumpTo = (zoom, center) =>
    page.evaluate(
      ([z, c]) => window.__intelmap24SuperadminMap.jumpTo({ zoom: z, ...(c ? { center: c } : {}) }),
      [zoom, center]
    );
  const openDatePanel = async () => {
    await page.locator('.tbd-trigger').click();
    await page.waitForSelector('.tbd-panel', { timeout: 5000 });
  };
  const clickPreset = async (label) => {
    await page.locator(`.tbd-panel .tui-date-preset:has-text("${label}")`).first().click();
  };
  const pillText = () => page.locator('.tbm').textContent();
  const triggerText = () => page.locator('.tbd-trigger').textContent();

  // ─── (pill-a) live default: LIVE pill + ticking time ───
  const pillClass0 = await page.locator('.tbm').getAttribute('class');
  check('(pill-a) live pill present by default', (pillClass0 || '').includes('tbm-live'), pillClass0);
  const pill1 = (await pillText()) || '';
  check(
    '(pill-a) pill shows LIVE + date + time',
    /LIVE · [A-Z]{3} \d{1,2} [A-Z]{3} · \d{2}:\d{2}:\d{2}/.test(pill1),
    pill1.trim()
  );
  await sleep(1200);
  const pill2 = (await pillText()) || '';
  check('(pill-a) embedded clock ticks', pill1 !== pill2, `${pill1.trim()} → ${pill2.trim()}`);

  // ─── (b) Yesterday → amber pill; dateFrom=dateTo request ───
  await openDatePanel();
  clearRequests();
  await clickPreset('Yesterday');
  await sleep(2000);
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const expectedYesterday = `${yesterday.getDate()} ${MMM(yesterday)} ${yesterday.getFullYear()}`;

  const reqsB = parsedRequests().filter((p) => p.dateFrom && p.dateTo);
  check('(b) /incidents request fired for Yesterday', reqsB.length > 0, `${reqsB.length} requests`);
  if (reqsB.length > 0) {
    check(
      '(b) request range is a single day (dateFrom=dateTo)',
      reqsB[0].dateFrom === reqsB[0].dateTo,
      `${reqsB[0].dateFrom} → ${reqsB[0].dateTo}`
    );
  }
  const pillTextB = (await pillText()) || '';
  check('(b) HISTORIC pill shows yesterday’s date', pillTextB.includes(`HISTORIC · ${expectedYesterday}`), pillTextB.trim());
  check('(b) LIVE pill gone', (await page.locator('.tbm-live').count()) === 0);
  const triggerClassB = await page.locator('.tbd-trigger').getAttribute('class');
  check('(b) trigger accent-tinted (active class)', (triggerClassB || '').includes('active'), triggerClassB);

  // ─── (c) Back to LIVE button ───
  await page.locator('.tbm-historic button').first().click();
  await sleep(1500);
  check('(c) Back to LIVE restores the live pill', (await page.locator('.tbm-live').count()) === 1);
  const labelC = (await triggerText()) || '';
  check('(c) date trigger back to Today', labelC.includes('Today'), labelC.trim());

  // ─── (d) single old date → press T ───
  await openDatePanel();
  await page.locator('.tui-date-section:has-text("Single date") input.tui-date-input').fill('2026-07-12');
  await sleep(1500);
  const pillTextD = (await pillText()) || '';
  check('(d) single old date → HISTORIC pill with that date', pillTextD.includes('HISTORIC · 12 JUL 2026'), pillTextD.trim());
  await page.mouse.click(60, 30); // move focus out of any input
  await page.keyboard.press('t');
  await sleep(1500);
  check('(d) pressing T returns to live', (await page.locator('.tbm-live').count()) === 1);

  // ─── (gate-c) All time at zoom ~3 → gated ───
  await jumpTo(3);
  await sleep(800);
  await openDatePanel();
  clearRequests();
  await clickPreset('All time');
  await sleep(2500);

  const reqsC = parsedRequests();
  const polygonReqs = reqsC.filter((p) => p.geometryType === 'polygon');
  const pointReqsC = reqsC.filter((p) => p.geometryType === 'point' || !p.geometryType);
  check('(gate-c) polygon zones still fetched when gated', polygonReqs.length > 0, `${polygonReqs.length} polygon reqs`);
  check('(gate-c) NO point-incidents fetch below gate zoom', pointReqsC.length === 0, `${pointReqsC.length} point reqs`);
  const hintVisible = await page
    .locator('text=Zoom in to load incidents for this range')
    .first()
    .isVisible()
    .catch(() => false);
  check('(gate-c) gate hint chip visible', hintVisible);
  const pillTextG = (await pillText()) || '';
  check('(gate-c) pill shows HISTORIC · ALL TIME', pillTextG.includes('HISTORIC · ALL TIME'), pillTextG.trim());

  // ─── (gate-d) zoom ≥ 6 → viewport-bounded point fetch ───
  clearRequests();
  await jumpTo(7, [36.2, 33.5]);
  await sleep(2500);
  const reqsD = parsedRequests();
  const pointViewportReqs = reqsD.filter((p) => p.geometryType === 'point' && p.viewport);
  check(
    '(gate-d) viewport-bounded point fetch fired at zoom ≥ 6',
    pointViewportReqs.length > 0,
    `${pointViewportReqs.length} reqs`
  );
  const hintGone = await page
    .locator('text=Zoom in to load incidents for this range')
    .first()
    .isVisible()
    .catch(() => false);
  check('(gate-d) gate hint chip hidden after zoom-in', !hintGone);

  // ─── (e) slim mode at 1280px → compact pill labels ───
  await openDatePanel();
  await clickPreset('Today');
  await sleep(1500);
  await page.setViewportSize({ width: 1280, height: 800 });
  await sleep(1200);
  const pillSlimLive = (await pillText()) || '';
  check('(e) slim live pill = "LIVE HH:MM:SS"', /^LIVE \d{2}:\d{2}:\d{2}$/.test(pillSlimLive.trim()), pillSlimLive.trim());
  await openDatePanel();
  await clickPreset('Yesterday');
  await sleep(1500);
  const expectedSlimHist = `${yesterday.getDate()} ${MMM(yesterday)}`;
  const pillSlimHist = (await pillText()) || '';
  check('(e) slim historic pill = "HIST <date>"', pillSlimHist.includes(`HIST ${expectedSlimHist}`), pillSlimHist.trim());

  console.log('\n================ SUMMARY ================');
  console.log(`${passed} passed, ${failed} failed`);
  await browser.close();
  process.exit(failed > 0 ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
