import { chromium } from 'playwright';

/**
 * Cheap DOM checks for the topbar/nav polish batch:
 *  1. Public Header nav is computed-centered on the viewport (logged out).
 *  2. /map topbar: nav hidden by default, brand click reveals, pill stays centered.
 *  3. /map?drawer=saved signed out → no drawer opens, param stripped (graceful).
 */
const USER_BASE = 'http://localhost:5173';
let passed = 0;
let failed = 0;
const check = (name, ok, detail = '') => {
  ok ? passed++ : failed++;
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ` — ${detail}` : ''}`);
};
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

// ─── 1. Header nav true center (logged out) ───
await page.goto(`${USER_BASE}/about`, { waitUntil: 'domcontentloaded' });
await page.waitForSelector('header nav', { timeout: 10000 });
await sleep(800);
const center = await page.evaluate(() => {
  const nav = document.querySelector('header nav');
  const r = nav.getBoundingClientRect();
  return { navCenter: r.x + r.width / 2, viewportCenter: window.innerWidth / 2 };
});
check(
  'header nav computed center ≈ viewport center (±2px)',
  Math.abs(center.navCenter - center.viewportCenter) <= 2,
  `nav=${center.navCenter.toFixed(1)} viewport=${center.viewportCenter.toFixed(1)}`
);

// ─── 2. /map topbar: nav hidden, brand reveals, pill centered ───
await page.goto(`${USER_BASE}/map`, { waitUntil: 'domcontentloaded' });
await page.waitForFunction(() => !!window.__geowatchUserMap, { timeout: 20000 });
await sleep(4500); // let any first-visit auto-peek settle (this profile has none)
const navLinks = await page.locator('header nav a').count();
check('map topbar nav hidden by default', navLinks === 0, `${navLinks} links`);

const pillCenter = () =>
  page.evaluate(() => {
    const cluster = document.querySelector('.tbm')?.parentElement; // pill + date group
    const r = cluster.getBoundingClientRect();
    return { c: r.x + r.width / 2, v: window.innerWidth / 2 };
  });
const pc1 = await pillCenter();
check('mode pill centered with nav hidden (±3px)', Math.abs(pc1.c - pc1.v) <= 3, `pill=${pc1.c.toFixed(1)} vp=${pc1.v.toFixed(1)}`);

await page.locator('header button[title="Show navigation"]').click();
await sleep(600);
const navLinksAfter = await page.locator('header nav a').count();
check('brand click reveals nav (3 links)', navLinksAfter === 3, `${navLinksAfter} links`);
const pc2 = await pillCenter();
console.log(`  (pill center revealed: ${pc2.c.toFixed(1)} vs vp ${pc2.v.toFixed(1)} — group shift allowed)`);
await page.locator('header nav a', { hasText: 'Map' }).first().click(); // link click collapses
await sleep(600);
const navLinksCollapsed = await page.locator('header nav a').count();
check('link click auto-collapses nav', navLinksCollapsed === 0, `${navLinksCollapsed} links`);

// ─── 3. ?drawer=saved signed out → graceful no-op ───
await page.goto(`${USER_BASE}/map?drawer=saved`, { waitUntil: 'domcontentloaded' });
await page.waitForFunction(() => !!window.__geowatchUserMap, { timeout: 20000 });
await sleep(2000);
const drawerVisible = await page.locator('text=Saved').first().isVisible().catch(() => false);
const urlHasDrawer = page.url().includes('drawer=');
check('signed-out ?drawer=saved → no saved drawer, param stripped', !drawerVisible && !urlHasDrawer, `drawer=${drawerVisible} url=${urlHasDrawer}`);

console.log(`\n${passed} passed, ${failed} failed`);
await browser.close();
process.exit(failed > 0 ? 1 : 0);
