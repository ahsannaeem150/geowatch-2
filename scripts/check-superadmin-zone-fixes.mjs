import { chromium } from 'playwright';

/**
 * check-superadmin-zone-fixes.mjs — spot-verify the admin-port zone fixes on
 * superadmin-web (:5175, dev handle window.__geowatchSuperadminMap):
 *   A: theme-style setStyle no longer strips zone layers (zone-hit survives)
 *   C: drawer zone rows show the zone category name (not "Unknown")
 *   B: clicking a drawer zone row deep-links via ?zone= (not ?incident=)
 */

const BASE = 'http://localhost:5175';
const API = 'http://localhost:3100/api/v1';
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
  page.on('pageerror', (e) => console.log('PAGEERROR:', e.message));

  await page.goto(`${BASE}/superadmin/map`, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(
    () => window.__geowatchSuperadminMap && window.__geowatchSuperadminMap.isStyleLoaded(),
    { timeout: 20000 }
  );
  const map = () => page.evaluate(() => {
    const m = window.__geowatchSuperadminMap;
    return {
      zoneHit: !!m.getLayer('zone-hit'),
      zonesSrc: !!m.getSource('zones'),
      styleUrl: m.getStyle()?.sprite || '',
    };
  });

  // ── A: theme-style setStyle keeps zone layers ──
  const before = await map();
  check('A: zone-hit layer present on load', before.zoneHit);

  const flipped = await page.evaluate(async () => {
    const m = window.__geowatchSuperadminMap;
    const current = document.documentElement.dataset.theme === 'light'
      ? '/map-style-light.json' : '/map-style-dark.json';
    const next = current.includes('dark') ? '/map-style-light.json' : '/map-style-dark.json';
    const idle = new Promise((res) => m.once('idle', res));
    m.setStyle(next);
    await Promise.race([idle, new Promise((r) => setTimeout(r, 8000))]);
    // let any post-idle styledata hooks settle
    await new Promise((r) => setTimeout(r, 500));
    return { zoneHit: !!m.getLayer('zone-hit'), zonesSrc: !!m.getSource('zones'), next };
  });
  check('A: zone-hit layer restored after setStyle', flipped.zoneHit, flipped.next);
  check('A: zones source restored after setStyle', flipped.zonesSrc);

  // ── Zone fixtures: which zones should the drawer list today? ──
  const zoneInfo = await page.evaluate(async (api) => {
    const token = localStorage.getItem('superadmin_token');
    const res = await fetch(`${api}/incidents?geometryType=polygon`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const body = await res.json();
    const rows = body?.data?.incidents || body?.data || [];
    return rows.map((z) => ({
      id: z.id,
      title: z.title,
      zoneCategoryName: z.zone_category_name || null,
    }));
  }, API);
  console.log(`INFO  ${zoneInfo.length} zone(s) in default list window`);
  check('C/B: at least one zone available to test', zoneInfo.length > 0,
    zoneInfo.map((z) => z.title).join(' | '));

  if (zoneInfo.length > 0) {
    // ── C: drawer zone rows show zone category name ──
    await page.click('button[title="Incidents"]');
    await sleep(800);
    const rows = await page.evaluate(() => {
      // IncidentCard rows: cursor:pointer cards containing a bold title div and
      // a category chip (span with a colored dot span inside).
      const cards = [...document.querySelectorAll('div[style*="cursor: pointer"]')];
      return cards.map((card) => {
        const titleEl = [...card.querySelectorAll('div')].find((d) => d.style.fontWeight === '700');
        const chip = [...card.querySelectorAll('span')].find((s) =>
          s.querySelector('span') && s.style.fontSize.includes('11px'));
        return {
          title: titleEl?.textContent?.trim() || '',
          category: chip?.textContent?.trim() || '',
        };
      }).filter((r) => r.title);
    });
    console.log(`INFO  drawer rows: ${rows.map((r) => `${r.title} [${r.category}]`).join(' | ') || '(none)'}`);

    for (const z of zoneInfo) {
      const row = rows.find((r) => r.title === z.title);
      if (!row) continue; // zone outside current drawer filter window
      check(`C: zone row "${z.title}" shows zone category`, row.category === (z.zoneCategoryName || 'Zone'),
        `chip="${row.category}"`);
    }
    const matched = zoneInfo.filter((z) => rows.some((r) => r.title === z.title));
    check('C: at least one zone row found in drawer', matched.length > 0);

    // ── B: clicking a zone row deep-links via ?zone= ──
    if (matched.length > 0) {
      const target = matched[0];
      await page.evaluate((title) => {
        const cards = [...document.querySelectorAll('div[style*="cursor: pointer"]')];
        const card = cards.find((c) =>
          [...c.querySelectorAll('div')].some((d) => d.style.fontWeight === '700' && d.textContent.trim() === title));
        card?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      }, target.title);
      await sleep(1200);
      const params = new URL(page.url()).searchParams;
      check(`B: zone row click sets ?zone= (${target.title})`,
        params.get('zone') === target.id && !params.get('incident'),
        page.url());
    }
  }

  console.log(`\n${passed} passed, ${failed} failed`);
  await browser.close();
  process.exit(failed > 0 ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
