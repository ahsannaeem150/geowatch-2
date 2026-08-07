import { chromium } from 'playwright';

/**
 * check-superadmin-drawer-port.mjs — smoke-verify the admin drawer overhaul
 * ported to superadmin-web (:5175):
 *   - all drawers render rows without page errors
 *   - activity drawer shows backfill history + audit-log footer
 *   - activity row click deep-links (?incident= / ?zone=)
 *   - active header "N total · ... older than 24h", notifications "Mark all as seen"
 */

const BASE = 'http://localhost:5175';
const AUTH_STATE = 'temp_screenshots/ui-sweep-superadmin/auth-state.json';

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

async function main() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    storageState: AUTH_STATE,
    viewport: { width: 1600, height: 950 },
  });
  const page = await context.newPage();
  const pageErrors = [];
  page.on('pageerror', (e) => pageErrors.push(e.message));

  await page.goto(`${BASE}/superadmin/map`, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(
    () => window.__geowatchSuperadminMap && window.__geowatchSuperadminMap.isStyleLoaded(),
    { timeout: 20000 }
  );
  await sleep(1500); // let backfill + notifications land

  // ── Activity drawer: backfill rows + footer ──
  await page.click('button[title="Activity"]');
  await sleep(700);
  const activity = await page.evaluate(() => {
    const drawer = document.querySelector('div[style*="--admin-drawer-width"], div[style*="width: var(--admin-drawer-width)"]') || document.body;
    const rows = [...drawer.querySelectorAll('div')].filter((d) =>
      d.style.borderRadius === 'var(--radius-md)' && d.style.cursor !== '' && d.textContent.length > 0
    );
    const footerBtn = [...drawer.querySelectorAll('button')].find((b) => b.textContent.includes('View full audit log'));
    return { rowCount: rows.length, hasFooter: !!footerBtn, drawerText: drawer.textContent.slice(0, 200) };
  });
  check('Activity: backfill rows render', activity.rowCount > 0, `${activity.rowCount} rows`);
  check('Activity: "View full audit log →" footer kept', activity.hasFooter);

  // ── Activity row click deep-links ──
  const clicked = await page.evaluate(() => {
    const candidates = [...document.querySelectorAll('div')].filter((d) =>
      d.style.cursor === 'pointer' && d.style.borderRadius === 'var(--radius-md)' &&
      d.querySelector('svg') && d.textContent.trim().length > 5
    );
    const row = candidates[0];
    if (!row) return false;
    row.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    return true;
  });
  await sleep(1200);
  if (clicked) {
    const params = new URL(page.url()).searchParams;
    check('Activity: row click deep-links selection', !!(params.get('incident') || params.get('zone')), page.url());
  } else {
    check('Activity: clickable row found', false);
  }
  // close drawer via rail toggle
  await page.click('button[title="Activity"]');
  await sleep(400);

  // ── Active drawer: header format + row cards ──
  await page.click('button[title="Active"]');
  await sleep(700);
  const active = await page.evaluate(() => {
    const text = document.body.textContent;
    const headerMatch = text.match(/(\d+) total\s*·?\s*(all|\d+)?\s*older than 24h|(\d+) total/);
    const hasResolve = [...document.querySelectorAll('button')].some((b) => b.textContent.trim() === 'Resolve');
    const has24h = text.includes('24h+');
    return { headerMatch: headerMatch?.[0] || null, hasResolve, has24h };
  });
  check('Active: header "N total( · … older than 24h)"', !!active.headerMatch, active.headerMatch || '');
  check('Active: ghost Resolve buttons on rows', active.hasResolve);
  console.log(`INFO  Active: 24h+ flags present = ${active.has24h}`);
  await page.click('button[title="Active"]');
  await sleep(400);

  // ── Incidents drawer: micro-label card design ──
  await page.click('button[title="Incidents"]');
  await sleep(700);
  const incidents = await page.evaluate(() => {
    const cards = [...document.querySelectorAll('div[style*="cursor: pointer"]')];
    const first = cards[0];
    if (!first) return { cards: 0 };
    const micro = [...first.querySelectorAll('span')].find((s) =>
      s.style.textTransform === 'uppercase' && s.style.fontSize.includes('10px'));
    const clampedTitle = [...first.querySelectorAll('div')].find((d) => d.style.webkitLineClamp === '2' || d.style.WebkitLineClamp === '2');
    return { cards: cards.length, hasMicro: !!micro, microText: micro?.textContent || '', hasClampedTitle: !!clampedTitle };
  });
  check('Incidents: cards render', incidents.cards > 0, `${incidents.cards} cards`);
  check('Incidents: 10px uppercase category micro-label', incidents.hasMicro, incidents.microText);
  check('Incidents: title clamped to 2 lines', incidents.hasClampedTitle);
  await page.click('button[title="Incidents"]');
  await sleep(400);

  // ── Notifications drawer ──
  await page.click('button[title="Notifications"]');
  await sleep(900);
  const notifs = await page.evaluate(() => {
    const markAll = [...document.querySelectorAll('button')].find((b) => b.textContent.trim() === 'Mark all as seen');
    const rows = [...document.querySelectorAll('div')].filter((d) =>
      d.style.borderRadius === 'var(--radius-md)' && d.style.boxShadow === 'var(--shadow-sm)');
    const empty = document.body.textContent.includes('No notifications.');
    return { hasMarkAll: !!markAll, rowCount: rows.length, empty };
  });
  console.log(`INFO  Notifications: rows=${notifs.rowCount} empty=${notifs.empty} markAllSeen=${notifs.hasMarkAll}`);
  check('Notifications: drawer renders (rows or empty state)', notifs.rowCount > 0 || notifs.empty);
  await page.click('button[title="Notifications"]');
  await sleep(400);

  // ── Recents drawer ──
  await page.click('button[title="Recents"]');
  await sleep(900);
  const recents = await page.evaluate(() => {
    const empty = document.body.textContent.includes('No recently viewed incidents.');
    const micros = [...document.querySelectorAll('span')].filter((s) =>
      s.style.textTransform === 'uppercase' && s.style.fontSize.includes('10px') && s.style.letterSpacing === '0.6px');
    return { empty, microCount: micros.length, sample: micros[0]?.textContent || '' };
  });
  console.log(`INFO  Recents: empty=${recents.empty} micro-labels=${recents.microCount} sample="${recents.sample}"`);
  check('Recents: drawer renders (enriched rows or empty state)', recents.empty || recents.microCount > 0);

  check('No page errors across all drawers', pageErrors.length === 0, pageErrors[0] || '');

  console.log(`\n${passed} passed, ${failed} failed`);
  await browser.close();
  process.exit(failed > 0 ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
