import { chromium } from 'playwright';

/**
 * check-back-restore-user.mjs — owner repro for the return-view context fix:
 * /map → "Last 30 days" → open an incident from the drawer → Full details →
 * Back. Asserts the map returns with full context: HISTORIC pill (not LIVE),
 * date trigger still on "Last 30 days", right panel open on the same incident.
 */
const USER_BASE = 'http://localhost:5173';
let passed = 0, failed = 0;
const check = (name, ok, detail = '') => {
  ok ? passed++ : failed++;
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ` — ${detail}` : ''}`);
};
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1700, height: 900 } });

await page.goto(`${USER_BASE}/map`, { waitUntil: 'domcontentloaded' });
await page.waitForSelector('.maplibregl-canvas', { timeout: 20000 });
await page.waitForFunction(() => !!window.__geowatchUserMap, { timeout: 20000 });
await sleep(3000);

// ─── Pick "Last 30 days" (exits live mode) ───
await page.locator('.tbd-trigger').click();
await page.waitForSelector('.tbd-panel', { timeout: 5000 });
await page.locator('.tbd-panel .tui-date-preset:has-text("Last 30 days")').first().click();
await sleep(2500);
const pillClassPre = await page.locator('.tbm').getAttribute('class');
check('setup: Last 30 days exits live (HISTORIC pill)', (pillClassPre || '').includes('tbm-historic'), pillClassPre);

// ─── Open an incident from the drawer ───
await page.click('button[title="Incidents"]');
await page.waitForSelector('text=Incidents in Viewport', { timeout: 5000 });
await sleep(800);
const drawer = page.locator('div', { has: page.getByText('Incidents in Viewport', { exact: true }) }).last().locator('xpath=..');
const cards = drawer.locator('div[style*="cursor: pointer"]');
const cardCount = await cards.count();
if (cardCount === 0) {
  check('setup: drawer lists incidents', false, 'no cards');
  await browser.close();
  process.exit(1);
}
await cards.nth(0).click();
await sleep(2500);
const selectedId = new URL(page.url()).searchParams.get('incident');
check('setup: incident selected (panel open, ?incident= in URL)', !!selectedId, selectedId || 'none');

// ─── Full details → detail page ───
await page.locator('button.id-btn-primary', { hasText: 'Full details' }).first().click();
await page.waitForSelector('button.opt1-back-link', { timeout: 10000 });
await sleep(1500);
check('setup: detail page opened', page.url().includes(`/incident/${selectedId}`), page.url());

// ─── Back → map must restore full context ───
await page.locator('button.opt1-back-link').first().click();
await page.waitForSelector('.maplibregl-canvas', { timeout: 15000 });
await page.waitForFunction(() => !!window.__geowatchUserMap, { timeout: 15000 });
await sleep(3000); // return-view restore + refetch with restored range + selection

const pillClass = await page.locator('.tbm').getAttribute('class');
const pillText = (await page.locator('.tbm').textContent()) || '';
check('Back: mode pill is HISTORIC (not LIVE)', (pillClass || '').includes('tbm-historic') && !pillText.startsWith('LIVE'), pillText.trim().slice(0, 40));

const triggerText = (await page.locator('.tbd-trigger').textContent()) || '';
check('Back: date trigger still "Last 30 days"', triggerText.includes('Last 30 days'), triggerText.trim());

// Panel re-opens on the same incident (wait for selection + panel)
let panelOk = false;
let finalId = null;
for (let i = 0; i < 10 && !panelOk; i++) {
  await sleep(700);
  finalId = new URL(page.url()).searchParams.get('incident');
  panelOk = finalId === selectedId && (await page.locator('button.id-btn-primary').first().isVisible().catch(() => false));
}
check('Back: right panel re-opened on the same incident', panelOk, `url incident=${finalId} expected=${selectedId}`);

console.log(`\n${passed} passed, ${failed} failed`);
await browser.close();
process.exit(failed > 0 ? 1 : 0);
