import { chromium } from 'playwright';

/**
 * verify-date-control-user.mjs — user-web (public, NO login) port of
 * verify-date-control.mjs. Checks the wired TopBarDateControl, the stateful
 * TopBarModePill (live clock + historic state), large-range gating, and slim
 * labels on http://localhost:5173/map:
 *   (pill-a) live default → pill shows LIVE + ticking time
 *   (a) "Last 7 days" → /incidents request 6-day diff; trigger label/tint;
 *       HISTORIC pill with range label
 *   (b) "Yesterday" → amber HISTORIC pill with yesterday's date; LIVE gone
 *   (c) "Back to LIVE" button → live pill returns
 *   (d) single old date → HISTORIC pill; pressing T → live returns
 *   (gate-c) "All time" at zoom ~3 → no point fetch; hint chip; zones fetched
 *   (gate-d) zoom ≥6 → viewport-bounded point fetch
 *   (e) slim mode at 1280px → compact pill labels
 */

const USER_BASE = 'http://localhost:5173';

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

// Mirror of TopBarModePill.historicLabel
function expectedHistoricLabel(fromISO, toISO) {
  if (!fromISO || !toISO) return 'ALL TIME';
  const from = new Date(`${fromISO}T00:00:00`);
  const to = new Date(`${toISO}T00:00:00`);
  if (fromISO === toISO) return `${from.getDate()} ${MMM(from)} ${from.getFullYear()}`;
  const sameYear = from.getFullYear() === to.getFullYear();
  const sameMonth = sameYear && from.getMonth() === to.getMonth();
  if (sameMonth) return `${MMM(from)} ${from.getDate()}–${to.getDate()} ${to.getFullYear()}`;
  if (sameYear) return `${MMM(from)} ${from.getDate()} – ${MMM(to)} ${to.getDate()} ${to.getFullYear()}`;
  return `${from.getDate()} ${MMM(from)} ${from.getFullYear()} – ${to.getDate()} ${MMM(to)} ${to.getFullYear()}`;
}

async function main() {
  const browser = await chromium.launch({ headless: true });
  // 1700px wide → full (non-slim) topbar
  const page = await browser.newPage({ viewport: { width: 1700, height: 900 } });

  const incidentRequests = [];
  page.on('request', (req) => {
    const url = req.url();
    if (url.includes('/incidents?')) incidentRequests.push(url);
  });
  const clearRequests = () => { incidentRequests.length = 0; };
  const parsedRequests = () =>
    incidentRequests.map((u) => Object.fromEntries(new URL(u).searchParams.entries()));

  // NOTE: SSE keeps a connection open, so 'networkidle' never fires — use domcontentloaded.
  await page.goto(`${USER_BASE}/map`, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('.maplibregl-canvas', { timeout: 20000 });
  await page.waitForFunction(() => !!window.__intelmap24UserMap, { timeout: 20000 });
  await sleep(3000); // incidents fetch + markers render

  const jumpTo = (zoom, center) =>
    page.evaluate(
      ([z, c]) => window.__intelmap24UserMap.jumpTo({ zoom: z, ...(c ? { center: c } : {}) }),
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

  // ─── (a) Last 7 days ───
  await openDatePanel();
  clearRequests();
  await clickPreset('Last 7 days');
  await sleep(2000);

  const reqsA = parsedRequests().filter((p) => p.dateFrom && p.dateTo);
  check('(a) /incidents request with dateFrom+dateTo fired', reqsA.length > 0, `${reqsA.length} requests`);
  let expectedA = '';
  if (reqsA.length > 0) {
    const { dateFrom, dateTo } = reqsA[0];
    const diffDays = Math.round((new Date(`${dateTo}T00:00:00`) - new Date(`${dateFrom}T00:00:00`)) / 86400000);
    check('(a) range spans ~7 days (6-day diff, inclusive)', diffDays === 6, `${dateFrom} → ${dateTo} (${diffDays})`);
    expectedA = expectedHistoricLabel(dateFrom, dateTo);
  }
  const labelA = (await triggerText()) || '';
  check('(a) trigger label updated', labelA.includes('Last 7 days'), labelA.trim());
  const triggerClassA = await page.locator('.tbd-trigger').getAttribute('class');
  check('(a) trigger accent-tinted (active class)', (triggerClassA || '').includes('active'), triggerClassA);
  const pillClassA = await page.locator('.tbm').getAttribute('class');
  check('(a) pill switched to HISTORIC (amber)', (pillClassA || '').includes('tbm-historic'), pillClassA);
  const pillTextA = (await pillText()) || '';
  check('(a) HISTORIC pill shows the range label', pillTextA.includes(`HISTORIC · ${expectedA}`), pillTextA.trim());

  // ─── (b) Yesterday → amber pill with the date; LIVE gone ───
  await openDatePanel();
  await clickPreset('Yesterday');
  await sleep(1500);
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const expectedYesterday = `${yesterday.getDate()} ${MMM(yesterday)} ${yesterday.getFullYear()}`;
  const pillTextB = (await pillText()) || '';
  check('(b) HISTORIC pill shows yesterday’s date', pillTextB.includes(`HISTORIC · ${expectedYesterday}`), pillTextB.trim());
  check('(b) LIVE pill gone', (await page.locator('.tbm-live').count()) === 0);

  // ─── (c) Back to LIVE button ───
  await page.locator('.tbm-historic button').first().click();
  await sleep(1500);
  check('(c) Back to LIVE restores the live pill', (await page.locator('.tbm-live').count()) === 1);
  const pillC1 = (await pillText()) || '';
  await sleep(1200);
  const pillC2 = (await pillText()) || '';
  check('(c) live pill clock ticking again', pillC1 !== pillC2, `${pillC1.trim()} → ${pillC2.trim()}`);
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
