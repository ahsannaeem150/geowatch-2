import { chromium } from 'playwright';
import { existsSync, mkdirSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

/**
 * check-ui-sweep-superadmin.mjs — READ-ONLY UI sweep of superadmin-web (:5175).
 * Screenshots → temp_screenshots/ui-sweep-superadmin/. Logs console/network errors.
 * Logs in ONCE (authLimiter 10/15min) and caches storageState for reruns.
 * NO data mutations: placement/drawing end in Cancel.
 */
const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const OUT = join(ROOT, 'temp_screenshots', 'ui-sweep-superadmin');
if (!existsSync(OUT)) mkdirSync(OUT, { recursive: true });
const AUTH_FILE = join(OUT, 'auth-state.json');

const BASE = 'http://localhost:5175';
const VIEWPORT = { width: 1440, height: 900 };
const CREDS = { email: 'admin@geowatch.local', password: 'AdminPass123!' };
// Dataset anchors (fresh ME/Pakistan seed)
const TANKER = { lng: 56.3, lat: 26.6, idHint: 'c76049ad' };
const HORMUZ_ZONE = { lng: 56.5, lat: 26.5, id: '6877644c-4557-4625-81fb-2809fd019a44' };

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const consoleLog = [];
const badResponses = [];
const mutationAttempts = [];

const browser = await chromium.launch();
const context = await browser.newContext({
  viewport: VIEWPORT,
  ...(existsSync(AUTH_FILE) ? { storageState: AUTH_FILE } : {}),
});
const page = await context.newPage();

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
// Mutation tripwire — the sweep must never write
page.on('request', (req) => {
  const m = req.method();
  if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(m) && req.url().includes('/api/v1/')) {
    // login is the one allowed POST
    if (req.url().includes('/auth/login')) return;
    mutationAttempts.push(`${m} ${req.url().slice(0, 140)}`);
  }
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
  await page.goto(`${BASE}/superadmin/map${suffix}`, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('.maplibregl-canvas', { timeout: 20000 });
  await page.waitForFunction(() => !!window.__intelmap24SuperadminMap, { timeout: 20000 });
  await sleep(3200);
}

async function flyTo(lng, lat, zoom) {
  await page.evaluate(
    ([lng, lat, zoom]) => window.__intelmap24SuperadminMap.jumpTo({ center: [lng, lat], zoom }),
    [lng, lat, zoom]
  );
  await sleep(1600);
}

async function clickMapAt(lng, lat) {
  const pt = await page.evaluate(
    ([lng, lat]) => {
      const p = window.__intelmap24SuperadminMap.project([lng, lat]);
      return { x: p.x, y: p.y };
    },
    [lng, lat]
  );
  await page.mouse.click(pt.x, pt.y);
}

const camBefore = () =>
  page.evaluate(() => {
    const m = window.__intelmap24SuperadminMap;
    const c = m.getCenter();
    return { lng: c.lng, lat: c.lat, zoom: m.getZoom() };
  });

const hasConsoleSidebar = () =>
  page.evaluate(() => !!document.querySelector('a[href="/superadmin/audit"]'));

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

// ═══ 0. Login (once) ═══
await section('login', async () => {
  await page.goto(`${BASE}/superadmin`, { waitUntil: 'domcontentloaded' });
  await sleep(1800);
  if (page.url().includes('/login')) {
    await shot('login-page');
    await page.locator('input[type="email"], input[name="email"]').first().fill(CREDS.email);
    await page.locator('input[type="password"]').first().fill(CREDS.password);
    await page.locator('button[type="submit"]').first().click();
    await page.waitForURL('**/superadmin**', { timeout: 15000 });
    await sleep(2000);
    await context.storageState({ path: AUTH_FILE });
    console.log('  logged in, storageState cached');
  } else {
    console.log('  reused cached storageState');
  }
});

// ═══ 1. Dashboard ═══
await section('dashboard', async () => {
  await page.goto(`${BASE}/superadmin`, { waitUntil: 'domcontentloaded' });
  await sleep(2500);
  await shot('dashboard-top');
  await page.evaluate(() => window.scrollTo({ top: window.innerHeight * 0.9, behavior: 'instant' }));
  await shot('dashboard-mid', 900);
  await page.evaluate(() => window.scrollTo({ top: document.body.scrollHeight, behavior: 'instant' }));
  await shot('dashboard-bottom', 900);
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
  // notifications bell
  const bell = page.locator('button[title="Notifications"]').first();
  if (await bell.count()) {
    await bell.click();
    await sleep(900);
    await shot('dashboard-notifications-dropdown');
    await page.keyboard.press('Escape');
    await page.mouse.click(10, 10);
    await sleep(400);
  } else {
    console.log('  ⚠ bell not found');
  }
});

// ═══ 2. Console pages ═══
const CONSOLE_PAGES = [
  ['users', 'Users'],
  ['public-users', 'Public users'],
  ['audit', 'System activity'],
  ['public-activity', 'Public activity'],
  ['domains', 'Domains'],
  ['zone-categories', 'Zone categories'],
  ['system', 'System'],
  ['export', 'Export'],
  ['recycle-bin', 'Recycle bin'],
  ['x-archive-debug', 'X archive debug'],
];
await section('console-pages', async () => {
  for (const [slug, label] of CONSOLE_PAGES) {
    await page.goto(`${BASE}/superadmin/${slug}`, { waitUntil: 'domcontentloaded' });
    await sleep(2200);
    await shot(`console-${slug}`);
    const crumb = await page.evaluate(() => document.body.innerText.split('\n').slice(0, 40).join(' | '));
    console.log(`  ${label}: sidebar=${await hasConsoleSidebar()}`);
  }
});

// ═══ 3. Map workspace ═══
await section('map-workspace', async () => {
  await gotoMap();
  await shot('map-initial');
  await flyTo(53, 26.5, 4.6);
  await shot('map-mideast-view');

  // date control panel
  const tbd = page.locator('.tbd-trigger').first();
  if (await tbd.count()) {
    await tbd.click();
    await page.waitForSelector('.tbd-panel', { timeout: 5000 });
    await shot('map-date-panel', 400);
    await page.keyboard.press('Escape');
    await page.mouse.click(720, 500);
    await sleep(500);
  }

  // rail drawers: layers
  const layersBtn = page.locator('button[title="Layers"], button:has-text("Layers")').first();
  if (await layersBtn.count()) {
    await layersBtn.click();
    await sleep(900);
    await shot('map-drawer-layers');
    await page.keyboard.press('Escape');
    await sleep(500);
  }

  // focus mode on/off
  const focusBtn = page.locator('button:has-text("Focus")').first();
  if (await focusBtn.count()) {
    await focusBtn.click();
    await sleep(900);
    await shot('map-focus-mode');
    await page.locator('button:has-text("Exit Focus")').first().click();
    await sleep(700);
  }

  // compact mode via settings drawer (toggle on, shot, toggle back)
  const settingsBtn = page.locator('button[title="Settings"], button:has-text("Settings")').first();
  if (await settingsBtn.count()) {
    await settingsBtn.click();
    await sleep(900);
    await shot('map-settings-drawer');
    const compact = page.locator('text=Compact mode').first();
    if (await compact.count()) {
      await compact.click();
      await sleep(900);
      await shot('map-compact-mode');
      await compact.click();
      await sleep(700);
    } else {
      console.log('  ⚠ compact toggle not found in settings drawer');
    }
    await page.keyboard.press('Escape');
    await sleep(500);
  }
});

// ═══ 4. Incident sidebar + evidence + lightbox ═══
await section('incident-sidebar', async () => {
  await gotoMap();
  await flyTo(TANKER.lng, TANKER.lat, 6.5);
  await clickMapAt(TANKER.lng, TANKER.lat);
  await sleep(2400);
  let selected = new URL(page.url()).searchParams.get('incident');
  if (!selected) {
    console.log('  marker click missed — deep-linking instead');
    await gotoMap('?incident=c76049ad-1462-41f5-8a5a-97a760776247');
    selected = new URL(page.url()).searchParams.get('incident');
  }
  console.log('  selected incident:', selected);
  await shot('incident-sidebar-top');
  await scrollRightPanel(0.35);
  await shot('incident-sidebar-mid', 700);
  await scrollRightPanel(0.7);
  await shot('incident-sidebar-low', 700);

  // click a timeline update → evidence drawer (text known from seed; fallback = first entry)
  let upd = page.locator('text=Crew of 23 confirmed safe').first();
  if (!(await upd.count())) {
    upd = page.locator('.id-tl-item, [class*="timeline"] button, [class*="Timeline"] li').first();
  }
  if (await upd.count()) {
    await upd.scrollIntoViewIfNeeded().catch(() => {});
    await upd.click();
    await sleep(1700);
    await shot('incident-evidence-drawer-media');
    for (const tab of ['Posts', 'Articles', 'Notes']) {
      const t = page.locator(`button:has-text("${tab}")`).first();
      if (await t.count()) {
        await t.click();
        await sleep(700);
        await shot(`incident-evidence-tab-${tab.toLowerCase()}`);
      }
    }
    const mediaTab = page.locator('button:has-text("Media")').first();
    if (await mediaTab.count()) await mediaTab.click();
    await sleep(700);
    const img = page.locator('.id-ev-grid img, [class*="evidence"] img').first();
    if (await img.count()) {
      await img.click();
      await sleep(1200);
      await shot('incident-lightbox');
      await page.keyboard.press('Escape');
      await sleep(800);
      await shot('incident-lightbox-closed');
    } else {
      console.log('  ⚠ no evidence image for lightbox');
    }
  } else {
    console.log('  ⚠ no timeline update found');
  }
});

// ═══ 5. Zone sidebar ═══
await section('zone-sidebar', async () => {
  await gotoMap();
  await flyTo(HORMUZ_ZONE.lng, HORMUZ_ZONE.lat, 6);
  await clickMapAt(HORMUZ_ZONE.lng, HORMUZ_ZONE.lat);
  await sleep(2400);
  let zoneId = new URL(page.url()).searchParams.get('zone');
  if (!zoneId) {
    console.log('  zone click missed — deep-linking instead');
    await gotoMap(`?zone=${HORMUZ_ZONE.id}`);
    zoneId = new URL(page.url()).searchParams.get('zone');
  }
  console.log('  selected zone:', zoneId);
  await shot('zone-sidebar-top');
  await scrollRightPanel(0.5);
  await shot('zone-sidebar-mid', 700);
  const upd = page.locator('text=Coalition issues escort advisory').first();
  if (await upd.count()) {
    await upd.scrollIntoViewIfNeeded().catch(() => {});
    await upd.click();
    await sleep(1500);
    await shot('zone-evidence-drawer');
    const img = page.locator('.id-ev-grid img, [class*="evidence"] img').first();
    if (await img.count()) {
      await img.click();
      await sleep(1100);
      await shot('zone-lightbox');
      await page.keyboard.press('Escape');
      await sleep(700);
    }
  } else {
    console.log('  ⚠ zone update text not found');
  }
});

// ═══ 6. Directories ═══
await section('directories', async () => {
  await page.goto(`${BASE}/superadmin/incidents`, { waitUntil: 'domcontentloaded' });
  await sleep(2400);
  await shot('dir-incidents');
  console.log('  incidents dir: sidebar=', await hasConsoleSidebar());
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
    await page.keyboard.press('Escape');
    await sleep(1300);
    await shot('dir-incidents-chips-filtered');
    // clear the filter again (read-only hygiene: leave page as found)
    const reset = page.locator('.tui-chip-reset').first();
    if (await reset.count()) await reset.click();
    await sleep(800);
  }
  await page.goto(`${BASE}/superadmin/zones`, { waitUntil: 'domcontentloaded' });
  await sleep(2400);
  await shot('dir-zones');
  const zTrigger = page.locator('button:has-text("Zone categories"), button:has-text("Categories")').first();
  if (await zTrigger.count()) {
    await zTrigger.click();
    await sleep(700);
    await shot('dir-zones-cms-flat');
    const noGo = page.locator('.cms-panel >> text=No-Go').first();
    if (await noGo.count()) await noGo.click();
    await page.keyboard.press('Escape');
    await sleep(1300);
    await shot('dir-zones-chips-filtered');
    const reset = page.locator('.tui-chip-reset').first();
    if (await reset.count()) await reset.click();
  }
  // breadcrumb Back → map
  await page.locator('button.opt1-back-link').first().click();
  await page.waitForSelector('.maplibregl-canvas', { timeout: 15000 });
  await shot('dir-back-to-map', 1800);
});

// ═══ 7. Detail pages + Back camera restore (CRITICAL: bare routes) ═══
await section('detail-pages-back-restore', async () => {
  await gotoMap();
  await flyTo(TANKER.lng, TANKER.lat, 7);
  const cam = await camBefore();
  console.log('  camera before detail:', JSON.stringify(cam));
  await clickMapAt(TANKER.lng, TANKER.lat);
  await sleep(2400);
  let selected = new URL(page.url()).searchParams.get('incident');
  if (!selected) {
    await gotoMap('?incident=c76049ad-1462-41f5-8a5a-97a760776247');
    selected = new URL(page.url()).searchParams.get('incident');
  }
  const fullBtn = page.locator('button.id-btn-primary', { hasText: 'Full details' }).first();
  if (await fullBtn.count()) {
    await fullBtn.click();
    await sleep(2600);
    console.log('  incident detail url:', page.url());
    console.log('  incident detail: console sidebar present =', await hasConsoleSidebar());
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
    console.log('  ⚠ Full details button not found');
  }

  // zone detail page
  await gotoMap(`?zone=${HORMUZ_ZONE.id}`);
  await shot('zone-selected-map');
  const zFull = page.locator('button.id-btn-primary', { hasText: 'Full details' }).first();
  if (await zFull.count()) {
    await zFull.click();
    await sleep(2600);
    console.log('  zone detail url:', page.url());
    console.log('  zone detail: console sidebar present =', await hasConsoleSidebar());
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

// ═══ 8. ⌘K palette ═══
await section('command-palette', async () => {
  await gotoMap();
  await page.keyboard.press('Control+k');
  await sleep(900);
  await shot('palette-open-idle');
  // Actions scope: groups + nav paths
  await page.locator('button:has-text("Actions")').first().click();
  await sleep(700);
  await shot('palette-actions-groups');
  // nav jump: Staff Users
  const navUsers = page.locator('button:has-text("Staff Users")').first();
  if (await navUsers.count()) {
    await navUsers.click();
    await sleep(2000);
    console.log('  after nav-jump url:', page.url());
    await shot('palette-nav-jump-users');
    await gotoMap();
    await page.keyboard.press('Control+k');
    await sleep(800);
  }
  // query + zones scope
  await page.keyboard.type('hormu', { delay: 40 });
  await sleep(1500);
  await shot('palette-hormu');
  await page.locator('button:has-text("Zones")').first().click();
  await sleep(700);
  await shot('palette-hormu-zones-scope');
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('ArrowDown');
  await sleep(400);
  await shot('palette-keyboard-nav');
  // locations via proxy
  await page.locator('button:has-text("All")').first().click();
  await page.locator('input').first().fill('');
  await page.keyboard.type('karachi', { delay: 40 });
  await sleep(1700);
  await shot('palette-karachi-locations');
  // bridge → Power Search
  const bridge = page.locator('button:has-text("Search all incidents")').first();
  if (await bridge.count()) {
    await bridge.click();
    await sleep(1900);
    await shot('palette-bridge-powersearch');
    await page.keyboard.press('Escape');
    await sleep(600);
  } else {
    console.log('  ⚠ bridge row not found');
  }
});

// ═══ 9. Placement + drawing (end in Cancel) ═══
await section('placement-drawing', async () => {
  await gotoMap();
  await flyTo(TANKER.lng, TANKER.lat, 6.5);
  // Add Incident → placement toolbar
  const addInc = page.locator('button:has-text("Add Incident")').first();
  await addInc.click();
  await sleep(1200);
  await shot('placement-toolbar-empty');
  await clickMapAt(TANKER.lng + 0.4, TANKER.lat - 0.3);
  await sleep(1300);
  await shot('placement-toolbar-placed');
  const cancelPlace = page.locator('button:has-text("Cancel")').first();
  await cancelPlace.click();
  await sleep(900);
  await shot('placement-cancelled');

  // Add Zone → drawing toolbar, 3 vertices, Cancel
  const addZone = page.locator('button:has-text("Add Zone")').first();
  await addZone.click();
  await sleep(1200);
  await clickMapAt(HORMUZ_ZONE.lng - 0.6, HORMUZ_ZONE.lat + 0.4);
  await sleep(500);
  await clickMapAt(HORMUZ_ZONE.lng - 0.1, HORMUZ_ZONE.lat + 0.6);
  await sleep(500);
  await clickMapAt(HORMUZ_ZONE.lng - 0.3, HORMUZ_ZONE.lat + 0.1);
  await sleep(900);
  await shot('drawing-toolbar-3-vertices');
  await page.locator('button[title="Cancel drawing (Esc)"]').first().click();
  await sleep(900);
  await shot('drawing-cancelled');
});

// ═══ 10. Light theme spot-check ═══
await section('light-theme', async () => {
  await page.goto(`${BASE}/superadmin`, { waitUntil: 'domcontentloaded' });
  await page.evaluate(() => localStorage.setItem('intelmap24-theme', 'light'));
  await page.reload({ waitUntil: 'domcontentloaded' });
  await sleep(2600);
  await shot('light-dashboard');
  await page.goto(`${BASE}/superadmin/map`, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('.maplibregl-canvas', { timeout: 20000 });
  await page.waitForFunction(() => !!window.__intelmap24SuperadminMap, { timeout: 20000 });
  await sleep(3400);
  await shot('light-map');
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
console.log('\n═══ MUTATION TRIPWIRE (expect empty) ═══');
for (const m of mutationAttempts) console.log(m);

await browser.close();
console.log('\nSweep complete.');
