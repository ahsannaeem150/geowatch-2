import { chromium } from 'playwright';
import { existsSync, mkdirSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const OUT = join(ROOT, 'temp_screenshots', 'home-polish');
if (!existsSync(OUT)) mkdirSync(OUT, { recursive: true });

const USER_BASE = 'http://localhost:5173';
let passed = 0, failed = 0;
const check = (name, ok, detail = '') => {
  ok ? passed++ : failed++;
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ` — ${detail}` : ''}`);
};
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

// Skip the boot sequence; count incident-list network calls
await page.addInitScript(() => sessionStorage.setItem('geowatch_booted', 'true'));
const incidentReqs = [];
page.on('request', (req) => {
  if (req.url().includes('/incidents?') || req.url().match(/\/incidents$|\?/)) {
    if (req.url().includes('/api/') && req.url().includes('/incidents') && !req.url().includes('/incidents/stream') && !req.url().includes('/incidents/saved')) {
      incidentReqs.push(req.url());
    }
  }
});

await page.goto(`${USER_BASE}/`, { waitUntil: 'domcontentloaded' });
await page.waitForSelector('.home-hero-hud', { timeout: 25000 });
await sleep(2500);

// ─── HUD ticks with the drift ───
const hud1 = (await page.locator('.home-hero-hud').textContent()) || '';
await sleep(3000);
const hud2 = (await page.locator('.home-hero-hud').textContent()) || '';
check('HUD text changes over ~3s of drift', hud1 !== hud2, `"${hud1.trim()}" → "${hud2.trim()}"`);
check('HUD shows N IN VIEW', /\d+\s+IN VIEW/.test(hud2), hud2.trim());
check('HUD shows 2-decimal coords', /\d{1,3}\.\d{2}°[NS]\s+\d{1,3}\.\d{2}°[EW]/.test(hud2), hud2.trim());

// ─── Headline restraint (no gradient) ───
const accentStyle = await page.evaluate(() => {
  const el = document.querySelector('.home-headline__accent');
  const cs = getComputedStyle(el);
  return { backgroundImage: cs.backgroundImage, filter: cs.filter, color: cs.color };
});
check('headline accent has no gradient (computed backgroundImage: none)',
  accentStyle.backgroundImage === 'none', accentStyle.backgroundImage);
check('headline accent has no drop-shadow glow (computed filter: none)',
  accentStyle.filter === 'none', accentStyle.filter);

// ─── Ledger band ───
const ledger = await page.evaluate(() => ({
  band: !!document.querySelector('.home-ledger'),
  cells: document.querySelectorAll('.home-ledger__cell').length,
  oldCards: document.querySelectorAll('.home-stat-card').length,
  value: document.querySelector('.home-ledger__value')?.textContent || '',
}));
check('ledger band renders 4 cells', ledger.band && ledger.cells === 4, `cells=${ledger.cells}`);
check('no SaaS stat cards remain', ledger.oldCards === 0, `${ledger.oldCards}`);
check('ledger value is a real count', /^\d+$/.test(ledger.value.replace(/,/g, '')), ledger.value);

// ─── Fetch consolidation ───
await sleep(1500);
check('getIncidents fired once on load (not ~6)', incidentReqs.length <= 2, `${incidentReqs.length} calls`);

// ─── Screenshots dark ───
await page.screenshot({ path: join(OUT, 'hero-dark.png') });
await page.locator('.home-ledger').first().scrollIntoViewIfNeeded();
await sleep(1200);
await page.screenshot({ path: join(OUT, 'ledger-dark.png') });

// ─── Light theme ───
await page.locator('header button[title="Switch to light mode"]').first().click();
await sleep(1500);
await page.locator('.home-hero').first().scrollIntoViewIfNeeded();
await sleep(400);
await page.screenshot({ path: join(OUT, 'hero-light.png') });
await page.locator('.home-ledger').first().scrollIntoViewIfNeeded();
await sleep(1200);
await page.screenshot({ path: join(OUT, 'ledger-light.png') });

// Light-mode sanity: ledger + HUD still readable
const hudLight = await page.locator('.home-hero-hud').isVisible().catch(() => false);
check('HUD visible in light theme', hudLight);

console.log(`\n${passed} passed, ${failed} failed — screenshots in temp_screenshots/home-polish/`);
await browser.close();
process.exit(failed > 0 ? 1 : 0);
