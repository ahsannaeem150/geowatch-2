import { chromium } from 'playwright';
import { mkdir, writeFile } from 'fs/promises';
import path from 'path';

const BASE = process.env.BASE_URL || 'http://localhost:5174';
const VIEWPORT = { width: 1600, height: 900 };
const OUT_DIR = 'temp_screenshots/right-panel-animation-verify';

const LOGIN = {
  email: 'admin@geowatch.local',
  password: 'AdminPass123!',
};

async function login(page) {
  await page.goto(`${BASE}/login`, { waitUntil: 'networkidle' });
  await page.fill('input[type="email"]', LOGIN.email);
  await page.fill('input[type="password"]', LOGIN.password);
  await page.click('button[type="submit"]');
  await page.waitForURL(`${BASE}/`, { waitUntil: 'networkidle' });
  await page.waitForSelector('canvas.maplibregl-canvas', { state: 'visible', timeout: 15000 });
  await page.waitForFunction(() => document.querySelectorAll('.maplibregl-marker').length > 0, { timeout: 10000 });
  await page.waitForTimeout(800);
}

async function screenshot(page, name) {
  const file = path.join(OUT_DIR, `${name}.png`);
  await page.screenshot({ path: file });
  console.log('Saved', file);
}

async function clickFirstMarker(page) {
  const marker = await page.locator('.maplibregl-marker').first();
  const box = await marker.boundingBox();
  if (!box) throw new Error('Marker bounding box not found');
  await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
}

async function measureLayoutFrames(page, durationMs = 450, intervalMs = 12) {
  const frames = [];
  const start = Date.now();
  while (Date.now() - start < durationMs) {
    const frame = await page.evaluate(() => {
      const panel = document.querySelector('.dashboard-right-panel-outer');
      const canvas = document.querySelector('.maplibregl-canvas');
      const panelRect = panel ? panel.getBoundingClientRect() : null;
      const canvasRect = canvas ? canvas.getBoundingClientRect() : null;
      return {
        panelRight: panelRect ? panelRect.right : 0,
        panelWidth: panelRect ? panelRect.width : 0,
        canvasWidth: canvasRect ? canvasRect.width : 0,
      };
    });
    frames.push({ t: Date.now() - start, ...frame });
    await page.waitForTimeout(intervalMs);
  }
  return frames;
}

function hasSmoothPanelSlide(frames, minSteps = 5) {
  const values = frames.map((f) => f.panelRight);
  const unique = [...new Set(values)].sort((a, b) => a - b);
  const first = values[0];
  const last = values[values.length - 1];
  const range = Math.abs(last - first);
  return {
    steps: unique.length,
    range,
    first,
    last,
    smooth: unique.length >= minSteps && range > 100,
  };
}

function hasConstantCanvasWidth(frames, tolerance = 2) {
  const values = frames.map((f) => f.canvasWidth);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const first = values[0];
  return {
    min,
    max,
    first,
    stable: max - min <= tolerance,
  };
}

(async () => {
  await mkdir(OUT_DIR, { recursive: true });
  const browser = await chromium.launch();
  const context = await browser.newContext({ viewport: VIEWPORT, recordVideo: { dir: OUT_DIR, size: VIEWPORT } });
  const page = await context.newPage();
  let allPass = true;

  try {
    await login(page);
    await screenshot(page, '00-before-click');

    // Ensure panel is closed.
    const closeBtn = await page.locator('button[title="Collapse sidebar"]').first();
    if (await closeBtn.isVisible().catch(() => false)) {
      await closeBtn.click();
      await page.waitForTimeout(400);
    }

    // Start measuring before the click.
    const before = await measureLayoutFrames(page, 50, 12);
    await clickFirstMarker(page);
    const after = await measureLayoutFrames(page, 450, 12);
    const frames = [...before, ...after.map((f) => ({ ...f, t: f.t + 50 }))];

    await page.waitForTimeout(1200);
    await screenshot(page, '01-after-transition');

    const panelAnalysis = hasSmoothPanelSlide(frames);
    const canvasAnalysis = hasConstantCanvasWidth(frames);

    console.log('Panel slide transition:');
    console.log(`  frames=${frames.length}, unique steps=${panelAnalysis.steps}, range=${panelAnalysis.range.toFixed(1)}px, first=${panelAnalysis.first.toFixed(1)}px, last=${panelAnalysis.last.toFixed(1)}px`);
    console.log(`  smooth=${panelAnalysis.smooth ? 'YES' : 'NO'}`);

    console.log('Map canvas width:');
    console.log(`  min=${canvasAnalysis.min.toFixed(1)}px, max=${canvasAnalysis.max.toFixed(1)}px, first=${canvasAnalysis.first.toFixed(1)}px`);
    console.log(`  stable=${canvasAnalysis.stable ? 'YES' : 'NO'}`);

    allPass = panelAnalysis.smooth && canvasAnalysis.stable && allPass;

    if (!panelAnalysis.smooth) {
      console.log('[FAIL] Right panel did not slide in smoothly.');
    } else {
      console.log('[PASS] Right panel slid in smoothly.');
    }

    if (!canvasAnalysis.stable) {
      console.log('[FAIL] Map canvas resized during the panel animation (may cause black flash).');
    } else {
      console.log('[PASS] Map canvas stayed at a constant size during the panel animation.');
    }

    await writeFile(path.join(OUT_DIR, 'frames.json'), JSON.stringify(frames, null, 2));

    console.log('\nOverall:', allPass ? 'PASS' : 'FAIL');
    process.exit(allPass ? 0 : 1);
  } finally {
    await page.close();
    await context.close();
    await browser.close();
  }
})();
