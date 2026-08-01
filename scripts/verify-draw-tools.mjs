import { chromium } from 'playwright';
import { existsSync, mkdirSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const OUT = join(ROOT, 'temp_screenshots', 'draw-tools');

if (!existsSync(OUT)) mkdirSync(OUT, { recursive: true });

const ADMIN_BASE = 'http://localhost:5174';
const API_BASE = process.env.API_BASE || 'http://localhost:3100/api/v1';
const VIEWPORT = { width: 1440, height: 900 };

const results = [];
const consoleErrors = [];

function check(name, ok, detail = '') {
  results.push({ name, ok, detail });
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ` — ${detail}` : ''}`);
}

async function main() {
  // ─── Single login via API; token injected into localStorage ───
  let token = null;
  for (let attempt = 1; attempt <= 2 && !token; attempt++) {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'admin@geowatch.local', password: 'AdminPass123!' }),
    });
    if (res.status === 429 && attempt === 1) {
      console.log('Rate limited — waiting 60s before retry…');
      await new Promise((r) => setTimeout(r, 60000));
      continue;
    }
    const body = await res.json();
    if (body.success && body.data?.token) token = body.data.token;
  }
  if (!token) {
    check('login (API token)', false, 'could not obtain token');
    process.exit(1);
  }
  check('login (API token)', true);

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
  await page.addInitScript((t) => localStorage.setItem('geowatch_token', t), token);

  // NOTE: SSE keeps a connection open — use domcontentloaded, not networkidle.
  await page.goto(`${ADMIN_BASE}/`, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('.maplibregl-canvas', { timeout: 20000 });
  await page.waitForFunction(() => !!window.__geowatchAdminMap, { timeout: 20000 });
  await page.waitForTimeout(3000);
  check('map loaded with dev debug handle', true);

  const canvasBox = await page.locator('.maplibregl-canvas').boundingBox();
  const mapPoint = (fx, fy) => ({ x: canvasBox.x + canvasBox.width * fx, y: canvasBox.y + canvasBox.height * fy });

  // ═══ (a) Incident placement mode ═══
  await page.click('button:has-text("Add Incident")');
  await page.waitForSelector('text=Create incident', { timeout: 5000 });
  await page.waitForTimeout(400);

  const hintArmed = await page.locator('text=Click on the map to place the incident').isVisible().catch(() => false);
  const cursor = await page.evaluate(() => window.__geowatchAdminMap.getCanvas().style.cursor);
  check('Add Incident → placement armed (hint chip + crosshair)', hintArmed && cursor === 'crosshair',
    `hint=${hintArmed} cursor="${cursor}"`);

  // Click the map → marker drops, form fields fill
  const p1 = mapPoint(0.5, 0.5);
  await page.mouse.click(p1.x, p1.y);
  await page.waitForTimeout(1200);
  const latVal = await page.locator('input[placeholder="Latitude"]').inputValue();
  const lngVal = await page.locator('input[placeholder="Longitude"]').inputValue();
  const hintAdjust = await page.locator('text=Drag to adjust, or click elsewhere to move').isVisible().catch(() => false);
  const markerCount1 = await page.locator('.maplibregl-marker').count();
  check('map click → marker placed + form lat/lng filled + adjust hint',
    latVal !== '' && lngVal !== '' && hintAdjust && markerCount1 >= 1,
    `lat="${latVal}" lng="${lngVal}" adjustHint=${hintAdjust} markers=${markerCount1}`);

  // Type coords → marker moves (transform of the placed marker changes)
  const placedMarkerTransform = async () => page.evaluate(() => {
    const els = [...document.querySelectorAll('.maplibregl-marker')];
    return els.map((e) => e.style.transform).join('|');
  });
  const before = await placedMarkerTransform();
  await page.locator('input[placeholder="Latitude"]').fill('20.5');
  await page.locator('input[placeholder="Longitude"]').fill('78.9');
  await page.waitForTimeout(1500);
  const after = await placedMarkerTransform();
  const latVal2 = await page.locator('input[placeholder="Latitude"]').inputValue();
  check('typing coords → marker moves to typed position',
    before !== after && parseFloat(latVal2) === 20.5,
    `lat="${latVal2}" transformChanged=${before !== after}`);

  // Esc → disarmed (hint gone, marker stays, form stays open)
  await page.click('canvas', { position: { x: 10, y: 10 } }).catch(() => {}); // move focus out of inputs
  await page.keyboard.press('Escape');
  await page.waitForTimeout(600);
  const hintGone = !(await page.locator('text=Drag to adjust, or click elsewhere to move').isVisible().catch(() => false));
  const markerStays = (await page.locator('.maplibregl-marker').count()) >= markerCount1;
  const formOpen = await page.locator('h2:has-text("Create incident")').isVisible().catch(() => false);
  const cursorAfter = await page.evaluate(() => window.__geowatchAdminMap.getCanvas().style.cursor);
  check('Esc → disarmed (hint hidden, marker + form stay, cursor normal)',
    hintGone && markerStays && formOpen && cursorAfter !== 'crosshair',
    `hintGone=${hintGone} markerStays=${markerStays} formOpen=${formOpen} cursor="${cursorAfter}"`);

  // Cancel the form → marker removed (only original incident markers may remain)
  const markersBeforeCancel = await page.locator('.maplibregl-marker').count();
  await page.click('button:has-text("Cancel")');
  await page.waitForTimeout(800);
  const markersAfterCancel = await page.locator('.maplibregl-marker').count();
  check('form cancel → placement marker removed',
    markersAfterCancel < markersBeforeCancel,
    `markers ${markersBeforeCancel}→${markersAfterCancel}`);
  await page.screenshot({ path: join(OUT, 'placement-mode.png') });

  // ═══ (b) Drawing toolbar 2.0 ═══
  await page.click('button:has-text("Add Zone")');
  await page.waitForSelector('text=Draw zone', { timeout: 5000 });
  await page.waitForTimeout(400);

  const toolBtns = {
    pan: await page.locator('button[title="Pan (V)"]').count(),
    polygon: await page.locator('button[title="Polygon (P)"]').count(),
    circle: await page.locator('button[title="Circle (C)"]').count(),
  };
  const undoDisabled = await page.locator('button[title="Undo (Ctrl+Z)"]').isDisabled();
  const redoDisabled = await page.locator('button[title="Redo (Ctrl+Shift+Z)"]').isDisabled();
  check('draw mode → toolbar shows Pan/Polygon/Circle + undo/redo disabled',
    toolBtns.pan === 1 && toolBtns.polygon === 1 && toolBtns.circle === 1 && undoDisabled && redoDisabled,
    `tools=${JSON.stringify(toolBtns)} undoDisabled=${undoDisabled} redoDisabled=${redoDisabled}`);

  // Polygon: 3 clicks → readout "3 vertices" + area; Ctrl+Z → 2
  await page.mouse.click(...Object.values(mapPoint(0.4, 0.4)));
  await page.waitForTimeout(300);
  await page.mouse.click(...Object.values(mapPoint(0.6, 0.4)));
  await page.waitForTimeout(300);
  await page.mouse.click(...Object.values(mapPoint(0.5, 0.6)));
  await page.waitForTimeout(600);
  const readout3 = await page.locator('text=Draw zone').locator('..').textContent();
  const has3 = /3 vertices/.test(readout3);
  const hasArea = /km²|m²/.test(readout3);
  const undoEnabled = !(await page.locator('button[title="Undo (Ctrl+Z)"]').isDisabled());
  check('polygon: 3 clicks → "3 vertices" + area readout + undo enabled',
    has3 && hasArea && undoEnabled,
    `readout="${readout3?.replace(/\s+/g, ' ').slice(0, 60)}" undoEnabled=${undoEnabled}`);

  await page.keyboard.press('Control+z');
  await page.waitForTimeout(400);
  const readout2 = await page.locator('text=Draw zone').locator('..').textContent();
  check('Ctrl+Z → vertex removed (2 vertices)',
    /2 vertices/.test(readout2),
    `readout="${readout2?.replace(/\s+/g, ' ').slice(0, 60)}"`);

  // Circle: switch tool, click center, move → radius label; click again → 64-vertex ring
  await page.click('button[title="Circle (C)"]');
  await page.waitForTimeout(300);
  await page.mouse.click(...Object.values(mapPoint(0.5, 0.45)));
  await page.waitForTimeout(300);
  const edge = mapPoint(0.62, 0.45);
  await page.mouse.move(edge.x, edge.y, { steps: 6 });
  await page.waitForTimeout(500);
  const radiusLabel = await page.evaluate(() => {
    const els = [...document.querySelectorAll('.maplibregl-marker')];
    const el = els.find((e) => /km/.test(e.textContent || ''));
    return el ? el.textContent.trim() : null;
  });
  check('circle: click center + move → live radius label',
    !!radiusLabel && /km/.test(radiusLabel),
    `label="${radiusLabel}"`);

  await page.mouse.click(edge.x, edge.y);
  await page.waitForTimeout(800);
  const readoutCircle = await page.locator('text=Draw zone').locator('..').textContent();
  const ringInfo = await page.evaluate(() => {
    const src = window.__geowatchAdminMap.getSource('draw-preview');
    const data = src?._data || src?.data;
    const poly = (data?.features || []).find((f) => f.geometry?.type === 'Polygon');
    return { ringLen: poly ? poly.geometry.coordinates[0].length : 0 };
  });
  check('circle finish → 64-vertex closed ring (≥60 in preview source)',
    /64 vertices/.test(readoutCircle) && ringInfo.ringLen >= 60,
    `readout="${readoutCircle?.replace(/\s+/g, ' ').slice(0, 60)}" ringLen=${ringInfo.ringLen}`);
  await page.screenshot({ path: join(OUT, 'circle-draw.png') });

  // Regression: the finishing click must NOT re-arm a new circle — moving the
  // mouse afterwards must not bring the radius label back.
  const away = mapPoint(0.35, 0.6);
  await page.mouse.move(away.x, away.y, { steps: 5 });
  await page.waitForTimeout(500);
  const labelReappeared = await page.evaluate(() =>
    [...document.querySelectorAll('.maplibregl-marker')].some((e) => /km/.test(e.textContent || '')));
  check('click-click finish does not re-arm (no radius label after finish)',
    !labelReappeared,
    `labelReappeared=${labelReappeared}`);

  // Coexisting drag path: fresh click arms, then press-drag-release finishes.
  const c2 = mapPoint(0.5, 0.5);
  await page.mouse.click(c2.x, c2.y); // arm new circle center
  await page.waitForTimeout(300);
  const dragStart = mapPoint(0.5, 0.5);
  const dragEnd = mapPoint(0.66, 0.5);
  await page.mouse.move(dragStart.x, dragStart.y);
  await page.mouse.down();
  await page.mouse.move(dragEnd.x, dragEnd.y, { steps: 8 });
  await page.mouse.up();
  await page.waitForTimeout(800);
  const readoutDrag = await page.locator('text=Draw zone').locator('..').textContent();
  const labelAfterDrag = await page.evaluate(() =>
    [...document.querySelectorAll('.maplibregl-marker')].some((e) => /km/.test(e.textContent || '')));
  check('drag-release path also finishes circle (64 vertices, no re-arm)',
    /64 vertices/.test(readoutDrag) && !labelAfterDrag,
    `readout="${readoutDrag?.replace(/\s+/g, ' ').slice(0, 60)}" labelAfterDrag=${labelAfterDrag}`);

  // Save → zone create form opens
  await page.click('button:has-text("Save")');
  await page.waitForTimeout(1200);
  const zoneFormOpen = await page.locator('.dashboard-right-panel').filter({ hasText: /zone/i }).count() > 0;
  check('Save → zone create form opens in right panel', zoneFormOpen);
  await page.screenshot({ path: join(OUT, 'zone-form-after-circle.png') });

  // Cancel draw mode cleanly
  await page.keyboard.press('Escape');
  await page.waitForTimeout(400);
  await page.locator('button:has-text("Cancel")').first().click().catch(() => {});
  await page.waitForTimeout(400);

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
