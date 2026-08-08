import { chromium } from 'playwright';
import { existsSync, mkdirSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

/** Palette-only re-run with overlay-scoped selectors (shots 50+). */
const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = join(__dirname, '..', 'temp_screenshots', 'ui-sweep-user');
if (!existsSync(OUT)) mkdirSync(OUT, { recursive: true });
const BASE = 'http://localhost:5173';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
page.on('pageerror', (err) => console.log('[pageerror]', err.message.slice(0, 200)));

let n = 50;
async function shot(name, wait = 0) {
  if (wait) await sleep(wait);
  n++;
  await page.screenshot({ path: join(OUT, `${n}-${name}.png`) });
  console.log(`📸 ${n}-${name}`);
}

await page.goto(`${BASE}/map`, { waitUntil: 'domcontentloaded' });
await page.waitForSelector('.maplibregl-canvas', { timeout: 20000 });
await page.waitForFunction(() => !!window.__intelmap24UserMap, { timeout: 20000 });
await sleep(3200);

await page.keyboard.press('Control+k');
await sleep(1000);

// scope the palette: the fixed overlay contains the search input
const overlay = page.locator('div:has(> div > input[placeholder*="Search"])').last();
const input = page.locator('input[placeholder*="Search"]').first();

await input.fill('hormu');
await sleep(1500);
await shot('palette-hormu-all');

// Zones scope tab — scoped to the palette overlay
const zonesTab = overlay.locator('button', { hasText: 'Zones' }).first();
await zonesTab.click({ timeout: 8000 });
await sleep(800);
await shot('palette-hormu-zones-scope');

// keyboard nav (two downs, then one up)
await page.keyboard.press('ArrowDown');
await page.keyboard.press('ArrowDown');
await page.keyboard.press('ArrowUp');
await sleep(500);
await shot('palette-keyboard-nav');

// Enter on first zone result → zone sidebar should open
await page.keyboard.press('ArrowDown');
await page.keyboard.press('Enter');
await sleep(2200);
const zoneParam = new URL(page.url()).searchParams.get('zone');
console.log('zone selected from palette:', zoneParam);
await shot('palette-zone-selected');

// reopen palette → karachi (locations via proxy)
await page.keyboard.press('Control+k');
await sleep(900);
await input.fill('karachi');
await sleep(1800);
await shot('palette-karachi-locations');

// locations scope
await overlay.locator('button', { hasText: 'Locations' }).first().click({ timeout: 8000 });
await sleep(600);
await shot('palette-karachi-locations-scope');

// select first location → fly-to
const firstLoc = overlay.locator('.omnibox-result-item').first();
await firstLoc.click();
await sleep(2200);
await shot('palette-location-flyto');

// rafah + bridge row
await page.keyboard.press('Control+k');
await sleep(900);
await input.fill('rafah');
await sleep(1600);
await shot('palette-rafah');
const bridge = overlay.locator('button', { hasText: 'Search all incidents' }).first();
if (await bridge.count()) {
  await bridge.click();
  await sleep(2000);
  await shot('palette-bridge-powersearch');
} else {
  console.log('⚠ bridge row not found');
}

await browser.close();
console.log('Palette re-run complete.');
