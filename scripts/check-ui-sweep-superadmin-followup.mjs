#!/usr/bin/env node
/**
 * GeoWatch superadmin-web UI sweep — FOLLOW-UP for sections whose selectors
 * missed in check-ui-sweep-superadmin.mjs. READ-ONLY (placement/drawing end
 * in Cancel; login POST is the only allowed write).
 *
 * Covers: zone detail page (bare layout), /zones CMS chips filter,
 * palette zones-scope/locations/bridge, placement cancel + drawing toolbar,
 * light theme (dashboard + map).
 */
import { chromium } from 'playwright';
import { mkdirSync, existsSync } from 'fs';

const BASE = 'http://localhost:5175';
const API = 'http://localhost:3100/api/v1';
const OUT = 'temp_screenshots/ui-sweep-superadmin';
const AUTH_FILE = `${OUT}/auth-state.json`;
const CREDS = { email: 'admin@geowatch.local', password: 'AdminPass123!' };
const HORMUZ_ZONE = { id: '6877644c-4557-4625-81fb-2809fd019a44', lng: 56.5, lat: 26.5 };

mkdirSync(OUT, { recursive: true });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const browser = await chromium.launch();
const context = await browser.newContext({
  viewport: { width: 1440, height: 900 },
  ...(existsSync(AUTH_FILE) ? { storageState: AUTH_FILE } : {}),
});
const page = await context.newPage();

const mutationAttempts = [];
page.on('request', (req) => {
  const m = req.method();
  if (m === 'GET' || !req.url().includes('/api/v1/')) return;
  if (m === 'POST' && req.url().includes('/auth/')) return;
  mutationAttempts.push(`${m} ${req.url()}`);
});

let n = 60; // continue numbering past 56
async function shot(name, settle = 700) {
  await sleep(settle);
  n += 1;
  const file = `${OUT}/${String(n).padStart(2, '0')}-${name}.png`;
  await page.screenshot({ path: file });
  console.log(`📸 ${String(n).padStart(2, '0')}-${name}`);
}
async function section(name, fn) {
  console.log(`\n── ${name} ──`);
  try { await fn(); } catch (err) {
    console.log(`⚠ SECTION ERROR: ${String(err).split('\n')[0]}`);
    await shot(`ERROR-${name}`, 100);
  }
}
async function gotoMap(qs = '') {
  await page.goto(`${BASE}/superadmin/map${qs}`, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('.maplibregl-canvas', { timeout: 20000 });
  await page.waitForFunction(() => !!window.__geowatchSuperadminMap, { timeout: 20000 });
  await sleep(3200);
}
async function flyTo(lng, lat, zoom) {
  await page.evaluate(([a, b, z]) => window.__geowatchSuperadminMap.jumpTo({ center: [a, b], zoom: z }), [lng, lat, zoom]);
  await sleep(1100);
}
async function clickMapAt(lng, lat) {
  const pt = await page.evaluate(([a, b]) => {
    const p = window.__geowatchSuperadminMap.project([a, b]);
    return { x: p.x, y: p.y };
  }, [lng, lat]);
  await page.mouse.click(pt.x, pt.y);
}
const hasConsoleSidebar = () => page.evaluate(() => !!document.querySelector('a[href="/superadmin/audit"]'));

// ensure authenticated; re-login once if the cached token was dropped
async function ensureAuth() {
  await page.goto(`${BASE}/superadmin`, { waitUntil: 'domcontentloaded' });
  await sleep(1800);
  if (page.url().includes('/login')) {
    console.log('  token missing — re-login once');
    await page.locator('input[type="email"]').fill(CREDS.email);
    await page.locator('input[type="password"]').fill(CREDS.password);
    await page.locator('button[type="submit"]').click();
    await page.waitForURL('**/superadmin**', { timeout: 15000 });
    await sleep(1500);
    await context.storageState({ path: AUTH_FILE });
  }
}
await ensureAuth();

// ═══ A. Zone detail page (bare route) + Back ═══
await section('zone-detail-page', async () => {
  await gotoMap(`?zone=${HORMUZ_ZONE.id}`);
  const fullBtn = page.locator('button:has-text("Full details"), button:has-text("FULL DETAILS")').first();
  await fullBtn.click();
  await sleep(2600);
  console.log('  zone detail url:', page.url());
  console.log('  zone detail: console sidebar present =', await hasConsoleSidebar());
  await shot('zone-detail-page-top');
  await page.evaluate(() => window.scrollTo({ top: document.body.scrollHeight, behavior: 'instant' }));
  await shot('zone-detail-page-bottom', 900);
  await page.locator('button.opt1-back-link').first().click();
  await page.waitForSelector('.maplibregl-canvas', { timeout: 15000 });
  await shot('back-map-restored-zone', 1600);
});

// ═══ B. /zones CMS chips filter (NOTMAR) ═══
await section('zones-chips', async () => {
  await page.goto(`${BASE}/superadmin/zones`, { waitUntil: 'domcontentloaded' });
  await sleep(2400);
  await page.locator('button:has-text("Zone categories")').first().click();
  await sleep(700);
  const notmar = page.locator('.cms-panel >> text=NOTMAR').first();
  if (await notmar.count()) await notmar.click();
  await page.keyboard.press('Escape');
  await sleep(1300);
  await shot('dir-zones-chips-filtered-v2');
  const reset = page.locator('.tui-chip-reset, button:has-text("Reset")').first();
  if (await reset.count()) await reset.click();
});

// ═══ C. Palette: zones scope, karachi locations, bridge ═══
await section('palette-v2', async () => {
  await gotoMap();
  await page.keyboard.press('Control+k');
  await sleep(900);
  const palInput = page.locator('input[placeholder*="Search"]').first();
  const panel = palInput.locator('xpath=ancestor::div[2]');
  await page.keyboard.type('hormu', { delay: 40 });
  await sleep(1500);
  await panel.locator('button:has-text("Zones")').first().click();
  await sleep(700);
  await shot('palette-hormu-zones-scope');
  // locations
  await panel.locator('button:has-text("All")').first().click();
  await palInput.fill('');
  await page.keyboard.type('karachi', { delay: 40 });
  await sleep(2200);
  await shot('palette-karachi-locations');
  const bridge = panel.locator('button:has-text("Search all incidents")').first();
  if (await bridge.count()) {
    await bridge.click();
    await sleep(1900);
    await shot('palette-bridge-powersearch');
    await page.keyboard.press('Escape');
    await sleep(500);
  } else {
    console.log('  ⚠ bridge row not found');
  }
  await page.keyboard.press('Escape');
});

// ═══ D. Placement cancel + drawing toolbar ═══
await section('placement-drawing-v2', async () => {
  await gotoMap();
  await flyTo(HORMUZ_ZONE.lng, HORMUZ_ZONE.lat, 6.5);
  await page.locator('button:has-text("Add Incident")').first().click();
  await sleep(1200);
  await clickMapAt(HORMUZ_ZONE.lng + 0.4, HORMUZ_ZONE.lat - 0.3);
  await sleep(1300);
  // visible Cancel only (hidden drawing-toolbar buttons share the label)
  await page.locator('button:has-text("Cancel"):visible').first().click();
  await sleep(900);
  await shot('placement-cancelled');
  await page.locator('button:has-text("Add Zone")').first().click();
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

// ═══ E. Light theme ═══
await section('light-theme-v2', async () => {
  await ensureAuth();
  await page.evaluate(() => localStorage.setItem('geowatch-theme', 'light'));
  await page.goto(`${BASE}/superadmin`, { waitUntil: 'domcontentloaded' });
  await sleep(2600);
  console.log('  light dashboard url:', page.url());
  await shot('light-dashboard');
  await page.goto(`${BASE}/superadmin/map`, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('.maplibregl-canvas', { timeout: 20000 });
  await page.waitForFunction(() => !!window.__geowatchSuperadminMap, { timeout: 20000 });
  await sleep(3600);
  await shot('light-map');
  await page.evaluate(() => localStorage.setItem('geowatch-theme', 'dark'));
});

console.log('\n═══ MUTATION TRIPWIRE (expect empty) ═══');
for (const m of mutationAttempts) console.log(m);
await browser.close();
console.log('\nFollow-up sweep complete.');
