import { chromium } from 'playwright';
import { existsSync, mkdirSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

/**
 * check-ui-sweep-admin.mjs — read/verify UI sweep of admin-web (READ-ONLY, no data mutations).
 * Logs in ONCE (staff admin), reuses storage state on reruns. Placement/drawing flows end in Cancel.
 * Saves screenshots to temp_screenshots/ui-sweep-admin/ and logs console/network errors.
 */
const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const OUT = join(ROOT, 'temp_screenshots', 'ui-sweep-admin');
if (!existsSync(OUT)) mkdirSync(OUT, { recursive: true });
const AUTH_STATE = join(OUT, 'auth-state.json');

const BASE = 'http://localhost:5174';
const VIEWPORT = { width: 1440, height: 900 };
const ADMIN_EMAIL = 'editor@geowatch.local';
const ADMIN_PASSWORD = 'EditorPass123!';

// Fresh dataset anchors (from DB):
const TANKER_ID = 'c76049ad-1462-41f5-8a5a-97a760776247'; // IRGC Seizes … Tanker in Strait of Hormuz (point, media-rich)
const TANKER_LNG = 56.3, TANKER_LAT = 26.6;
const HORMUZ_ZONE_ID = '6877644c-4557-4625-81fb-2809fd019a44'; // Hormuz Naval Exclusion Zone (polygon)
const ZONE_LNG = 56.5, ZONE_LAT = 26.5;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const consoleLog = [];
const badResponses = [];

const browser = await chromium.launch();
const hasState = existsSync(AUTH_STATE);
const context = await browser.newContext({
  viewport: VIEWPORT,
  ...(hasState ? { storageState: AUTH_STATE } : {}),
});
const page = await context.newPage();
if (hasState) console.log('Reusing saved auth state (no login this run).');

page.on('console', (msg) => {
  if (['error', 'warning'].includes(msg.type())) {
    consoleLog.push({ type: msg.type(), text: msg.text().slice(0, 400) });
  }
});
page.on('pageerror', (err) => consoleLog.push({ type: 'pageerror', text: err.message.slice(0, 400) }));
page.on('response', (res) => {
  if (res.status() >= 400 && !res.url().includes('favicon')) {
    badResponses.push({ status: res.status(), url: res.url().slice(0, 160) });
  }
});
page.on('requestfailed', (req) => {
  badResponses.push({ status: 'FAILED', url: req.url().slice(0, 160), err: req.failure()?.errorText });
});

let shotIdx = 0;
async function shot(name, wait = 0) {
  if (wait) await sleep(wait);
  shotIdx++;
  const file = join(OUT, `${String(shotIdx).padStart(2, '0')}-${name}.png`);
  await page.screenshot({ path: file });
  console.log(`📸 ${shotIdx}-${name}`);
}

async function section(name, fn) {
  console.log(`\n── ${name} ──`);
  try {
    await fn();
  } catch (err) {
    console.log(`⚠ SECTION ERROR: ${err.message.split('\n')[0]}`);
    await shot(`ERROR-${name.replace(/\W+/g, '-')}`).catch(() => {});
  }
}

async function gotoMap(suffix = '') {
  await page.goto(`${BASE}/${suffix}`, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('.maplibregl-canvas', { timeout: 20000 });
  await page.waitForFunction(() => !!window.__intelmap24AdminMap, { timeout: 20000 });
  await sleep(3200);
}

async function flyTo(lng, lat, zoom) {
  await page.evaluate(
    ([lng, lat, zoom]) => window.__intelmap24AdminMap.jumpTo({ center: [lng, lat], zoom }),
    [lng, lat, zoom]
  );
  await sleep(1600);
}

// project() is canvas-relative; the admin canvas is inset by the rail (left) and topbar (top).
async function clickMapAt(lng, lat) {
  const pt = await page.evaluate(
    ([lng, lat]) => {
      const p = window.__intelmap24AdminMap.project([lng, lat]);
      const r = document.querySelector('.maplibregl-canvas').getBoundingClientRect();
      return { x: r.x + p.x, y: r.y + p.y };
    },
    [lng, lat]
  );
  await page.mouse.click(pt.x, pt.y);
}

const camBefore = () =>
  page.evaluate(() => {
    const m = window.__intelmap24AdminMap;
    const c = m.getCenter();
    return { lng: c.lng, lat: c.lat, zoom: m.getZoom() };
  });

// Scroll the right-hand panel (sidebar) to a fraction of its scroll height.
async function scrollRightPanel(frac) {
  await page.evaluate((frac) => {
    const els = document.querySelectorAll('div');
    for (const el of els) {
      if (el.scrollHeight > el.clientHeight + 200 && el.getBoundingClientRect().left > window.innerWidth * 0.5) {
        el.scrollTop = el.scrollHeight * frac;
        return true;
      }
    }
  }, frac);
}

const sidebarOpen = () =>
  page.locator('button:has-text("Full details")').first().isVisible().catch(() => false);

// Select the tanker incident. Try a TRUE marker click first (the marker wrapper is 0x0,
// so click its 24px child visual); fall back to ⌘K palette.
async function selectTanker() {
  await flyTo(TANKER_LNG, TANKER_LAT, 6.5);
  const markerVisual = page.locator(`[data-incident-id="${TANKER_ID}"] > *`).first();
  const markerCount = await markerVisual.count();
  console.log('  tanker marker visual present:', markerCount > 0);
  if (markerCount) {
    await markerVisual.click({ timeout: 5000 }).catch((e) => console.log('  marker click failed:', e.message.split('\n')[0]));
    await sleep(2000);
  }
  let ok = await sidebarOpen();
  console.log('  sidebar open after marker click:', ok);
  if (!ok) {
    console.log('  falling back to ⌘K palette selection');
    await page.keyboard.press('Control+k');
    await sleep(900);
    await page.keyboard.type('tanker', { delay: 40 });
    await sleep(1500);
    await page.keyboard.press('Enter');
    await sleep(2600);
    ok = await sidebarOpen();
    console.log('  sidebar open after palette selection:', ok);
  }
  return ok;
}

// ═══ 1. Login page + login flow ═══
await section('login', async () => {
  await page.goto(`${BASE}/login`, { waitUntil: 'domcontentloaded' });
  await sleep(1800);
  if (hasState && !page.url().includes('/login')) {
    console.log('  already authenticated — skipped /login render');
    return;
  }
  await shot('login-page');
  await page.fill('input[type="email"]', ADMIN_EMAIL);
  await page.fill('input[type="password"]', ADMIN_PASSWORD);
  await shot('login-filled');
  await page.click('button[type="submit"]');
  await page.waitForSelector('.maplibregl-canvas', { timeout: 25000 });
  await page.waitForFunction(() => !!window.__intelmap24AdminMap, { timeout: 25000 });
  await sleep(3500);
  console.log('  landed on:', page.url());
  await shot('login-landing-map');
  await context.storageState({ path: AUTH_STATE });
  console.log('  storage state saved.');
});

// ═══ 2. Map workspace HUD initial load ═══
await section('map-initial', async () => {
  await gotoMap();
  await shot('map-initial-hud');
  await flyTo(53, 26.5, 4.6);
  await shot('map-mideast-view');
});

// ═══ 3. Left rail drawers ═══
await section('rail-drawers', async () => {
  await gotoMap();
  for (const [id, label] of [['layers', 'Layers'], ['incidents', 'Incidents'], ['active', 'Active']]) {
    await page.click(`button[title="${label}"]`);
    await sleep(1100);
    await shot(`rail-drawer-${id}`);
    await page.click(`button[title="${label}"]`); // close
    await sleep(500);
  }
  // notifications drawer (staff bell lives in the rail)
  await page.click('button[title="Notifications"]');
  await sleep(1100);
  await shot('rail-drawer-notifications');
  await page.click('button[title="Notifications"]');
  await sleep(500);
  // settings drawer (theme / compact / reduce motion)
  await page.click('button[title="Settings"]');
  await sleep(1100);
  await shot('rail-drawer-settings');
  await page.click('button[title="Settings"]'); // close (Escape does not close drawers)
  await sleep(500);
});

// ═══ 4. Incident select → staff sidebar → timeline → evidence drawer → lightbox ═══
await section('incident-sidebar', async () => {
  await gotoMap();
  const ok = await selectTanker();
  if (!ok) console.log('  ⚠ could not open tanker sidebar');
  await shot('incident-sidebar-top');
  await scrollRightPanel(0.35);
  await shot('incident-sidebar-mid', 700);
  await scrollRightPanel(0.7);
  await shot('incident-sidebar-low', 700);

  // click a timeline update → evidence drawer
  let upd = page.locator('text=Crew of 23 confirmed safe').first();
  if (!(await upd.count())) {
    console.log('  known update text not found — clicking first timeline entry');
    upd = page.locator('.id-tl-item, [class*="timeline"] [class*="entry"], [class*="timeline"] li').first();
  }
  if ((await upd.count()) && (await upd.isVisible().catch(() => false))) {
    await upd.scrollIntoViewIfNeeded().catch(() => {});
    await upd.click();
    await sleep(1600);
    await shot('incident-evidence-drawer-media');
    for (const tab of ['Posts', 'Articles', 'Notes']) {
      const t = page.locator(`button:has-text("${tab}"), [role="tab"]:has-text("${tab}")`).first();
      if ((await t.count()) && (await t.isVisible().catch(() => false))) {
        await t.click({ timeout: 4000 }).catch(() => {});
        await sleep(700);
        await shot(`incident-evidence-tab-${tab.toLowerCase()}`);
      } else {
        console.log(`  tab not present/visible: ${tab}`);
      }
    }
    const mediaTab = page.locator('button:has-text("Media"), [role="tab"]:has-text("Media")').first();
    if ((await mediaTab.count()) && (await mediaTab.isVisible().catch(() => false))) {
      await mediaTab.click({ timeout: 4000 }).catch(() => {});
    }
    await sleep(700);
    const img = page.locator('.id-ev-grid img, [class*="evidence"] img, .id-lightbox-trigger img').first();
    const anyImg = (await img.count()) ? img : page.locator('aside img, .id-sidebar img').first();
    if (await anyImg.count()) {
      await anyImg.click({ timeout: 4000 }).catch(() => {});
      await sleep(1200);
      await shot('incident-lightbox');
      await page.keyboard.press('Escape');
      await sleep(800);
      await shot('incident-lightbox-closed');
    } else {
      console.log('  ⚠ no image found for lightbox');
    }
  } else {
    console.log('  ⚠ no timeline update found');
  }
});

// ═══ 5. Zone select → zone sidebar (staff version) ═══
await section('zone-sidebar', async () => {
  await gotoMap();
  await flyTo(ZONE_LNG, ZONE_LAT, 6);
  await clickMapAt(ZONE_LNG, ZONE_LAT);
  await sleep(2200);
  let ok = await sidebarOpen();
  console.log('  zone sidebar open after map click:', ok);
  if (!ok) {
    console.log('  zone click missed — falling back to deep link');
    await gotoMap(`?zone=${HORMUZ_ZONE_ID}`);
    await page.waitForSelector('button:has-text("Full details")', { timeout: 10000 }).catch(() => {});
    ok = await sidebarOpen();
  }
  await shot('zone-sidebar-top');
  await scrollRightPanel(0.5);
  await shot('zone-sidebar-mid', 700);
  let upd = page.locator('text=Coalition issues escort advisory').first();
  if (!(await upd.count())) {
    upd = page.locator('.id-tl-item, [class*="timeline"] [class*="entry"], [class*="timeline"] li').first();
  }
  if ((await upd.count()) && (await upd.isVisible().catch(() => false))) {
    await upd.scrollIntoViewIfNeeded().catch(() => {});
    await upd.click();
    await sleep(1500);
    await shot('zone-evidence-drawer');
    const img = page.locator('.id-ev-grid img, [class*="evidence"] img').first();
    if (await img.count()) {
      await img.click({ timeout: 4000 }).catch(() => {});
      await sleep(1100);
      await shot('zone-lightbox');
      await page.keyboard.press('Escape');
      await sleep(700);
    }
  } else {
    console.log('  ⚠ zone update text not found');
  }
});

// ═══ 6. Directories /incidents + /zones ═══
await section('directories', async () => {
  await page.goto(`${BASE}/incidents`, { waitUntil: 'domcontentloaded' });
  await sleep(2400);
  await shot('dir-incidents');
  const trigger = page.locator('button:has-text("Categories")').first();
  if (await trigger.count()) {
    await trigger.click();
    await sleep(800);
    await shot('dir-incidents-cms-accordion');
    const conflictRow = page.locator('.cms-panel >> text=Conflict').first();
    if (await conflictRow.count()) {
      await conflictRow.click();
      await sleep(600);
      await shot('dir-incidents-cms-domain-drill');
      const airStrike = page.locator('.cms-panel >> text=Air Strike').first();
      if (await airStrike.count()) await airStrike.click();
    }
    const search = page.locator('.cms-panel input').first();
    if (await search.count()) {
      await search.fill('labor');
      await sleep(500);
      const labor = page.locator('.cms-panel >> text=Labor Strike').first();
      if (await labor.count()) await labor.click();
      await search.fill('');
    }
    await page.keyboard.press('Escape');
    await sleep(1400);
    await shot('dir-incidents-chips-filtered');
  } else {
    console.log('  ⚠ CategoryMultiSelect trigger not found on /incidents');
  }
  await page.goto(`${BASE}/zones`, { waitUntil: 'domcontentloaded' });
  await sleep(2400);
  await shot('dir-zones');
  const zTrigger = page.locator('button:has-text("Zone categories"), button:has-text("Categories")').first();
  if (await zTrigger.count()) {
    await zTrigger.click();
    await sleep(700);
    await shot('dir-zones-cms-flat');
    await page.keyboard.press('Escape');
  }
});

// ═══ 7. Detail pages + Back → instant camera restore ═══
await section('detail-pages-back-restore', async () => {
  await gotoMap();
  await selectTanker();
  await sleep(1500); // let the selection ease settle — this camera is the Back target
  const cam = await camBefore();
  console.log('  camera before detail:', JSON.stringify(cam));
  const fullBtn = page.locator('button:has-text("Full details")').first();
  if (await fullBtn.count()) {
    await fullBtn.click();
    await sleep(2600);
    await shot('incident-detail-page-top');
    await page.evaluate(() => window.scrollTo({ top: window.innerHeight * 0.95, behavior: 'instant' }));
    await shot('incident-detail-page-mid', 900);
    await page.evaluate(() => window.scrollTo({ top: document.body.scrollHeight, behavior: 'instant' }));
    await shot('incident-detail-page-bottom', 900);
    await page.locator('button.opt1-back-link').first().click();
    await page.waitForSelector('.maplibregl-canvas', { timeout: 15000 });
    await shot('back-map-restored-incident', 1200);
    await sleep(2000);
    const camAfter = await camBefore();
    console.log('  camera after back:', JSON.stringify(camAfter));
    console.log(`  zoom drift: ${Math.abs(camAfter.zoom - cam.zoom).toFixed(3)} (expect ~0)`);
    await shot('back-map-restored-incident-settled');
  } else {
    console.log('  ⚠ Full details button not found (incident)');
  }

  // zone detail page
  await gotoMap(`?zone=${HORMUZ_ZONE_ID}`);
  await page.waitForSelector('button:has-text("Full details")', { timeout: 10000 }).catch(() => {});
  await shot('zone-selected-map');
  const zFull = page.locator('button:has-text("Full details")').first();
  if (await zFull.count()) {
    await zFull.click();
    await sleep(2600);
    await shot('zone-detail-page-top');
    await page.evaluate(() => window.scrollTo({ top: document.body.scrollHeight, behavior: 'instant' }));
    await shot('zone-detail-page-bottom', 900);
    await page.locator('button.opt1-back-link').first().click();
    await page.waitForSelector('.maplibregl-canvas', { timeout: 15000 });
    await shot('back-map-restored-zone', 1500);
  } else {
    console.log('  ⚠ zone Full details button not found');
  }
});

// ═══ 8. ⌘K palette + bridge → Power Search ═══
// NOTE: palette scope tabs share labels with topbar buttons ("Zones") — the
// palette renders later in the DOM, so scope-tab locators use .last().
await section('command-palette', async () => {
  await gotoMap();
  await page.keyboard.press('Control+k');
  await sleep(900);
  await shot('palette-open-idle');
  await page.keyboard.type('hormu', { delay: 40 });
  await sleep(1400);
  await shot('palette-hormu');
  await page.locator('button:has-text("Zones")').last().click();
  await sleep(700);
  await shot('palette-hormu-zones-scope');
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('ArrowDown');
  await sleep(400);
  await shot('palette-keyboard-nav');
  // actions scope
  const actionsTab = page.locator('button:has-text("Actions")').last();
  if (await actionsTab.count()) {
    await actionsTab.click();
    await sleep(600);
    await shot('palette-actions-scope');
  }
  // locations via proxy
  await page.locator('button:has-text("All")').last().click();
  await page.locator('input').first().fill('');
  await page.keyboard.type('karachi', { delay: 40 });
  await sleep(1600);
  await shot('palette-karachi-locations');
  // bridge → Power Search seeded
  await page.locator('input').first().fill('');
  await page.keyboard.type('hormu', { delay: 40 });
  await sleep(1400);
  const bridge = page.locator('button:has-text("Search all incidents")').last();
  if (await bridge.count()) {
    await bridge.click();
    await sleep(2000);
    await shot('palette-bridge-powersearch');
    await page.keyboard.press('Escape'); // closes power search
    await sleep(700);
  } else {
    console.log('  ⚠ bridge row not found');
    await page.keyboard.press('Escape');
  }
});

// ═══ 9. Power Search overlay ═══
await section('power-search', async () => {
  await gotoMap();
  await page.click('button[title="Open advanced search page"]');
  await sleep(1500);
  await shot('powersearch-open');
  const input = page.locator('input[placeholder="Search incidents…"]').first();
  if (await input.count()) {
    await input.fill('hormu');
    await sleep(1800);
    await shot('powersearch-hormu-results');
  } else {
    console.log('  ⚠ power search input not found');
  }
  const filtersBtn = page.locator('button:has-text("Filters")').first();
  if (await filtersBtn.count()) {
    await filtersBtn.click();
    await sleep(800);
    await shot('powersearch-filters-panel');
  }
  const back = page.locator('button[title="Back to workspace"]').first();
  if (await back.count()) {
    await back.click();
    await sleep(900);
    await shot('powersearch-closed-workspace');
  }
});

// ═══ 10. Add Incident → placement toolbar → Cancel (READ-ONLY) ═══
await section('placement-flow', async () => {
  await gotoMap();
  await flyTo(48, 26, 4.2);
  await page.locator('button', { hasText: 'Add Incident' }).first().click();
  await sleep(1600); // right panel opens, camera eases with new padding
  await page.waitForSelector('text=Place incident', { timeout: 6000 });
  await shot('placement-toolbar-no-point');
  // click the visible map area (left of the form panel) → readout updates
  await page.mouse.click(380, 470);
  await sleep(1500);
  const hasCoords = await page.locator('text=/-?\\d+\\.\\d{4}, -?\\d+\\.\\d{4}/').count();
  console.log('  coords readout visible after map click:', hasCoords > 0);
  await shot('placement-point-placed');
  // Clear point
  await page.click('button[title="Clear point"]', { timeout: 5000 });
  await sleep(900);
  const cleared = await page.locator('text=No point placed').count();
  console.log('  readout back to "No point placed" after Clear:', cleared > 0);
  await shot('placement-cleared');
  // place again, then try Cancel (short timeout — Cancel may be covered by the form panel)
  await page.mouse.click(430, 520);
  await sleep(1200);
  await shot('placement-replaced-before-cancel');
  const cancelBtn = page.locator('button[title="Cancel placement (Esc)"]');
  let cancelClicked = false;
  try {
    await cancelBtn.click({ timeout: 4000 });
    cancelClicked = true;
  } catch {
    console.log('  ⚠ Cancel button NOT clickable (likely covered by the right panel) — using Esc instead');
  }
  await shot('placement-cancel-attempt');
  if (!cancelClicked) {
    await page.keyboard.press('Escape'); // dismiss toolbar
    await sleep(700);
    await page.keyboard.press('Escape'); // close form panel
    await sleep(700);
  }
  await sleep(900);
  const toolbarGone = (await page.locator('text=Place incident').count()) === 0;
  const formGone = (await page.locator('text=Create incident').count()) === 0;
  const tempMarkers = await page.evaluate(() => document.querySelectorAll('.maplibregl-marker:not([data-incident-id])').length);
  console.log('  placement toolbar gone:', toolbarGone, '| form panel closed:', formGone, '| temp markers left:', tempMarkers);
  await shot('placement-cancelled-clean');
});

// ═══ 11. Add Zone → drawing toolbar → 3 vertices → undo/redo → Cancel (READ-ONLY) ═══
await section('drawing-flow', async () => {
  await gotoMap();
  await flyTo(55.5, 25.2, 5.5);
  await page.locator('button', { hasText: 'Add Zone' }).first().click();
  await sleep(1300);
  await page.waitForSelector('text=Draw zone', { timeout: 6000 });
  await shot('draw-toolbar-start');
  // draw 3 vertices
  await clickMapAt(55.0, 25.4);
  await sleep(500);
  await clickMapAt(56.0, 25.4);
  await sleep(500);
  await clickMapAt(55.5, 24.8);
  await sleep(900);
  const v3 = await page.locator('text=3 vertices').count();
  console.log('  readout "3 vertices":', v3 > 0);
  await shot('draw-3-vertices');
  // undo → 2 vertices; redo → 3 vertices
  await page.click('button[title="Undo (Ctrl+Z)"]');
  await sleep(600);
  const v2 = await page.locator('text=2 vertices').count();
  console.log('  readout "2 vertices" after undo:', v2 > 0);
  await shot('draw-undo-2-vertices');
  await page.click('button[title="Redo (Ctrl+Shift+Z)"]');
  await sleep(600);
  await shot('draw-redo-3-vertices');
  // tool segments: switch to Circle then back to Polygon
  await page.click('button[title="Circle (C)"]');
  await sleep(600);
  await shot('draw-circle-tool');
  await page.click('button[title="Polygon (P)"]');
  await sleep(500);
  // Cancel — nothing saved
  await page.click('button[title="Cancel drawing (Esc)"]');
  await sleep(1100);
  const gone = (await page.locator('text=Draw zone').count()) === 0;
  console.log('  drawing toolbar gone after Cancel:', gone);
  await shot('draw-cancelled-clean');
});

// ═══ 12. Focus mode + compact mode ═══
await section('focus-compact', async () => {
  await gotoMap();
  await page.click('button[title="Toggle focus mode"]');
  await sleep(1000);
  await shot('focus-mode-on');
  await page.click('button[title="Toggle focus mode"]');
  await sleep(900);
  await shot('focus-mode-off');
  // compact mode via settings drawer. Switch order in the drawer:
  // Auto-zoom → Compact → Reduce motion. Identify the compact switch by row text.
  // Also restore auto-zoom to ON if a previous sweep run left it toggled off.
  await page.click('button[title="Settings"]');
  await sleep(1100);
  const swInfo = await page.evaluate(() =>
    [...document.querySelectorAll('button[role="switch"]')].map((b) => ({
      label: b.closest('div[style*="space-between"]')?.textContent?.slice(0, 60) || '',
      checked: b.getAttribute('aria-checked'),
    }))
  );
  console.log('  drawer switches:', JSON.stringify(swInfo));
  const azOff = await page.evaluate(() => localStorage.getItem('intelmap24_admin_auto_zoom') === 'false');
  if (azOff) {
    console.log('  auto-zoom was left OFF by a previous run — restoring ON');
    await page.locator('button[role="switch"]').nth(0).click();
    await sleep(600);
  }
  const compactIdx = await page.evaluate(() =>
    [...document.querySelectorAll('button[role="switch"]')].findIndex((b) =>
      b.closest('div[style*="space-between"]')?.textContent?.includes('Compact mode')
    )
  );
  console.log('  compact switch index:', compactIdx);
  if (compactIdx >= 0) {
    await page.locator('button[role="switch"]').nth(compactIdx).click();
    await sleep(900);
    const compactOn = await page.evaluate(() => document.documentElement.classList.contains('admin-compact'));
    console.log('  html.admin-compact after toggle:', compactOn);
    await shot('compact-mode-settings');
    // close drawer by clicking the rail Settings button again (Escape does not close it)
    await page.click('button[title="Settings"]');
    await sleep(700);
    await shot('compact-mode-workspace');
    // restore: reopen, toggle compact back off, close
    await page.click('button[title="Settings"]');
    await sleep(1000);
    await page.locator('button[role="switch"]').nth(compactIdx).click();
    await sleep(700);
    const compactOff = await page.evaluate(() => !document.documentElement.classList.contains('admin-compact'));
    console.log('  compact restored off:', compactOff);
    await page.click('button[title="Settings"]');
    await sleep(600);
  } else {
    console.log('  ⚠ compact switch not found in settings drawer');
  }
});

// ═══ 13. Light theme spot-check ═══
await section('light-theme', async () => {
  await page.goto(`${BASE}/`, { waitUntil: 'domcontentloaded' });
  await page.evaluate(() => localStorage.setItem('intelmap24-theme', 'light'));
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.waitForSelector('.maplibregl-canvas', { timeout: 20000 });
  await page.waitForFunction(() => !!window.__intelmap24AdminMap, { timeout: 20000 });
  await sleep(3500);
  await shot('light-map');
  await gotoMap(`?incident=${TANKER_ID}`);
  await page.waitForSelector('button:has-text("Full details")', { timeout: 10000 }).catch(() => {});
  await shot('light-incident-sidebar');
  await page.evaluate(() => localStorage.setItem('intelmap24-theme', 'dark'));
});

console.log('\n═══ CONSOLE ERRORS/WARNINGS ═══');
const seen = new Set();
for (const c of consoleLog) {
  const key = c.text.slice(0, 120);
  if (seen.has(key)) continue;
  seen.add(key);
  console.log(`[${c.type}] ${c.text}`);
}
console.log('\n═══ FAILED / 4xx-5xx REQUESTS ═══');
const seenR = new Set();
for (const r of badResponses) {
  const key = `${r.status} ${r.url}`;
  if (seenR.has(key)) continue;
  seenR.add(key);
  console.log(`${r.status} ${r.url}${r.err ? ` (${r.err})` : ''}`);
}

await browser.close();
console.log('\nSweep complete.');
