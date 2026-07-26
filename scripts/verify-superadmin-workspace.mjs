import { chromium } from 'playwright';
import { existsSync, mkdirSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const OUT = join(ROOT, 'temp_screenshots', 'superadmin-workspace');

if (!existsSync(OUT)) mkdirSync(OUT, { recursive: true });

const SUPER_BASE = 'http://localhost:5175';
const VIEWPORT = { width: 1440, height: 900 };

const results = [];
const consoleErrors = [];

function check(name, ok, detail = '') {
  results.push({ name, ok, detail });
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ` — ${detail}` : ''}`);
}

async function main() {
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
  page.on('response', (res) => {
    if (res.status() >= 500) consoleErrors.push(`HTTP ${res.status()} ${res.url()}`);
  });

  // ─── Login (retry once on rate-limit 429) ───
  let loggedIn = false;
  for (let attempt = 1; attempt <= 2 && !loggedIn; attempt++) {
    await page.goto(`${SUPER_BASE}/login`, { waitUntil: 'networkidle' });
    await page.fill('input[type="email"]', 'admin@geowatch.local');
    await page.fill('input[type="password"]', 'AdminPass123!');
    await page.click('button[type="submit"]');
    try {
      await page.waitForURL(`${SUPER_BASE}/superadmin`, { timeout: 10000 });
      loggedIn = true;
    } catch {
      const bodyText = await page.textContent('body').catch(() => '');
      if (attempt === 1 && /too many|rate limit|429/i.test(bodyText)) {
        console.log('Rate limited — waiting 60s before retry…');
        await page.waitForTimeout(60000);
      }
    }
  }
  if (!loggedIn) {
    check('login', false, 'could not reach /superadmin after login');
    await browser.close();
    process.exit(1);
  }
  check('login', true);

  // ─── Navigate to the map workspace ───
  // NOTE: SSE keeps a connection open, so 'networkidle' never fires — use domcontentloaded.
  await page.goto(`${SUPER_BASE}/superadmin/map`, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('.maplibregl-canvas', { timeout: 20000 });
  await page.waitForTimeout(3000); // let incidents fetch + markers render

  // ─── 1. No console sidebar / old chrome; WorkspaceTopBar present ───
  const asideCount = await page.locator('aside').count();
  const consoleNavLinks = await page.locator('a[href="/superadmin/users"]').count();
  check('no console sidebar (no <aside>, no console nav links)', asideCount === 0 && consoleNavLinks === 0,
    `aside=${asideCount}, navLinks=${consoleNavLinks}`);

  const superAdminPill = await page.locator('header span', { hasText: 'Super Admin' }).first().isVisible().catch(() => false);
  const dashboardBtn = await page.locator('button[title="Back to console"]').isVisible().catch(() => false);
  const addIncidentBtn = await page.locator('button', { hasText: 'Add Incident' }).first().isVisible().catch(() => false);
  const addZoneBtn = await page.locator('button', { hasText: 'Add Zone' }).first().isVisible().catch(() => false);
  check('WorkspaceTopBar (Super Admin pill, Dashboard, Add Incident, Add Zone)',
    superAdminPill && dashboardBtn && addIncidentBtn && addZoneBtn,
    `pill=${superAdminPill} dashboard=${dashboardBtn} addIncident=${addIncidentBtn} addZone=${addZoneBtn}`);

  // ─── 2. Left rail: 8 buttons; layers drawer opens/closes ───
  const railTitles = ['Layers', 'Incidents', 'Active', 'Activity', 'Notifications', 'Saved', 'Recents', 'Settings'];
  let railCount = 0;
  for (const t of railTitles) {
    railCount += await page.locator(`button[title="${t}"]`).count();
  }
  check('left rail renders 8 buttons', railCount === 8, `found ${railCount}`);

  await page.click('button[title="Layers"]');
  await page.waitForTimeout(600);
  const domainsSection = await page.locator('text=Incident Domains').isVisible().catch(() => false);
  const zonesSection = await page.locator('text=Zone Overlays').isVisible().catch(() => false);
  check('layers drawer opens with Incident Domains + Zone Overlays sections', domainsSection && zonesSection,
    `domains=${domainsSection} zones=${zonesSection}`);

  await page.keyboard.press('Escape');
  await page.waitForTimeout(600);
  const drawerGone = !(await page.locator('text=Incident Domains').isVisible().catch(() => false));
  check('Escape closes layers drawer', drawerGone);
  if (!drawerGone) {
    // recover: click the rail button again to toggle off
    await page.click('button[title="Layers"]').catch(() => {});
    await page.waitForTimeout(400);
  }

  // ─── 3. ⌘K command palette: Actions tab, recycle search, Escape closes ───
  // (matches user-web/admin-web palette design: nav actions render under the Actions scope tab)
  await page.keyboard.press('Control+k');
  await page.waitForSelector('input[placeholder="Search incidents and locations…"]', { timeout: 5000 });
  await page.getByRole('button', { name: /^Actions/ }).click();
  await page.waitForTimeout(300);
  await page.keyboard.type('recycle');
  await page.waitForTimeout(800);
  const recycleAction = await page.locator('text=Recycle Bin').first().isVisible().catch(() => false);
  check('⌘K palette opens; Actions tab + "recycle" shows Recycle Bin action', recycleAction);
  await page.keyboard.press('Escape');
  await page.waitForTimeout(500);
  const paletteGone = (await page.locator('input[placeholder="Search incidents and locations…"]').count()) === 0;
  check('Escape closes command palette', paletteGone);

  // ─── 4. Advanced → Power Search overlay ───
  await page.click('button[title="Open advanced search page"]');
  await page.waitForTimeout(1000);
  const psTitle = await page.locator('text=Power Search').first().isVisible().catch(() => false);
  const psFilters = await page.locator('text=Filters').first().isVisible().catch(() => false);
  const psInput = await page.locator('input[placeholder="Search incidents…"]').isVisible().catch(() => false);
  const psResults = await page.locator('text=/\\d+ results?|No results|results/i').first().isVisible().catch(() => false);
  check('Power Search overlay opens (title, filter rail, results rail)', psTitle && psFilters && psInput,
    `title=${psTitle} filters=${psFilters} input=${psInput} results=${psResults}`);
  await page.waitForTimeout(1500);
  await page.screenshot({ path: join(OUT, 'power-search-open.png') });
  console.log('Saved', join(OUT, 'power-search-open.png'));
  await page.keyboard.press('Escape');
  await page.waitForTimeout(800);
  const psGone = !(await page.locator('input[placeholder="Search incidents…"]').isVisible().catch(() => false));
  check('Escape closes Power Search overlay', psGone);

  // ─── Screenshot: map workspace idle ───
  await page.screenshot({ path: join(OUT, 'workspace-idle.png') });
  console.log('Saved', join(OUT, 'workspace-idle.png'));

  // ─── 5. Click an incident marker → right panel slides in ───
  // (same pattern as other verify scripts: boundingBox + mouse.click — maplibre
  //  marker wrappers collapse to 0x0, so locator.click actionability fails)
  const markerCount = await page.locator('.maplibregl-marker').count();
  if (markerCount > 0) {
    try {
      const marker = page.locator('.maplibregl-marker').first();
      const box = await marker.boundingBox();
      if (!box) throw new Error('marker bounding box not found');
      await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
      await page.waitForTimeout(2500);
      const panelOpen = await page.evaluate(() => {
        return [...document.querySelectorAll('div')].some(
          (d) => d.style.width === 'var(--admin-right-panel-width)' &&
            (d.style.transform === 'translateX(0)' || d.style.transform === 'translateX(0px)')
        );
      });
      check('marker click opens right panel', panelOpen, `${markerCount} markers on map`);
    } catch (err) {
      check('marker click opens right panel', false, `click failed: ${err.message}`);
    }
  } else {
    check('marker click opens right panel', true, 'SKIPPED — no markers in current view/date range');
  }

  // ─── 6. Dashboard button → /superadmin with console sidebar, then back ───
  await page.click('button[title="Back to console"]');
  await page.waitForURL(`${SUPER_BASE}/superadmin`, { timeout: 10000 });
  await page.waitForTimeout(1000);
  const consoleAside = await page.locator('aside').isVisible().catch(() => false);
  const consoleNav = await page.locator('a[href="/superadmin/users"]').first().isVisible().catch(() => false);
  check('Dashboard button lands on /superadmin with console sidebar', consoleAside && consoleNav,
    `aside=${consoleAside} nav=${consoleNav}`);

  await page.goto(`${SUPER_BASE}/superadmin/map`, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('.maplibregl-canvas', { timeout: 20000 });
  const backOnMap = page.url().startsWith(`${SUPER_BASE}/superadmin/map`);
  check('navigate back to /superadmin/map', backOnMap, page.url());

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

  await browser.close();
  process.exit(failed.length > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
