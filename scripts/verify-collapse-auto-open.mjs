import { chromium } from 'playwright';
import { mkdir } from 'fs/promises';
import path from 'path';

const BASE = process.env.BASE_URL || 'http://localhost:5174';
const VIEWPORT = { width: 1600, height: 900 };
const OUT_DIR = 'temp_screenshots/right-panel-collapse-verify';

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

async function screenshotPanel(page, name) {
  const panel = page.locator('.dashboard-right-panel');
  await panel.waitFor({ state: 'visible', timeout: 5000 });
  await page.waitForTimeout(400);
  const file = path.join(OUT_DIR, `${name}.png`);
  await panel.screenshot({ path: file });
  console.log('Saved', file);
}

async function collapsePanel(page) {
  const btn = page.getByTitle('Collapse sidebar');
  await btn.waitFor({ state: 'visible', timeout: 3000 });
  await btn.click();
  await page.locator('.dashboard-right-panel').waitFor({ state: 'hidden', timeout: 3000 });
  await page.waitForTimeout(300);
}

async function clickFirstMarker(page) {
  const marker = await page.locator('.maplibregl-marker').first();
  const box = await marker.boundingBox();
  if (!box) throw new Error('Marker bounding box not found');
  await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
}

(async () => {
  await mkdir(OUT_DIR, { recursive: true });
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: VIEWPORT });

  try {
    await login(page);

    // 1) Click an incident marker -> detail panel opens
    await clickFirstMarker(page);
    await screenshotPanel(page, 'admin-click-incident');

    // 2) Collapse the panel
    await collapsePanel(page);

    // 3) Click the same marker again -> panel should auto-open
    await clickFirstMarker(page);
    await screenshotPanel(page, 'admin-click-incident-while-collapsed');

    // 4) Collapse again
    await collapsePanel(page);

    // 5) Enter focus mode
    await page.getByTitle('Toggle focus mode').click();
    await page.waitForTimeout(600);

    // 6) Click marker in focus mode -> panel should open
    await clickFirstMarker(page);
    await screenshotPanel(page, 'admin-focus-mode-incident');

    // 7) Collapse in focus mode
    await collapsePanel(page);

    // 8) Double-click map in focus mode to create incident -> create panel should open
    const canvas = await page.locator('canvas.maplibregl-canvas').first();
    const box = await canvas.boundingBox();
    await page.mouse.dblclick(box.x + box.width / 2, box.y + box.height / 2);
    await screenshotPanel(page, 'admin-focus-mode-create-incident');
  } finally {
    await page.close();
    await browser.close();
  }
})();
