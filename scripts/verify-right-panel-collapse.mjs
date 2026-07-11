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
  await page.waitForTimeout(1000);
}

async function screenshotCreateIncident(browser) {
  const page = await browser.newPage({ viewport: VIEWPORT });
  await login(page);

  const canvas = await page.locator('canvas.maplibregl-canvas').first();
  const box = await canvas.boundingBox();
  const cx = box.x + box.width / 2;
  const cy = box.y + box.height / 2;

  await page.mouse.dblclick(cx, cy);
  const panel = page.locator('.dashboard-right-panel');
  await panel.waitFor({ state: 'visible', timeout: 5000 });
  await page.waitForTimeout(500);

  const file = path.join(OUT_DIR, 'admin-create-incident.png');
  await panel.screenshot({ path: file });
  console.log('Saved', file);
  await page.close();
}

async function screenshotCreateZone(browser) {
  const page = await browser.newPage({ viewport: VIEWPORT });
  await login(page);

  const canvas = await page.locator('canvas.maplibregl-canvas').first();
  const box = await canvas.boundingBox();
  const cx = box.x + box.width / 2;
  const cy = box.y + box.height / 2;

  // Open empty context menu and start zone drawing
  await page.mouse.click(cx, cy, { button: 'right' });
  await page.getByText('Create Zone Here').click();
  await page.waitForTimeout(300);

  // Add vertices to form a polygon
  const offsets = [
    [0, -60],
    [50, 20],
    [-50, 20],
  ];
  for (const [dx, dy] of offsets) {
    await page.mouse.click(cx + dx, cy + dy);
    await page.waitForTimeout(200);
  }

  // Close polygon with double-click
  await page.mouse.dblclick(cx, cy - 60);
  await page.waitForTimeout(300);

  // Save drawing
  const saveBtn = page.locator('button', { hasText: 'Save' }).filter({ has: page.locator('svg') }).first();
  await saveBtn.waitFor({ state: 'visible', timeout: 5000 });
  await saveBtn.click();

  const panel = page.locator('.dashboard-right-panel');
  await panel.waitFor({ state: 'visible', timeout: 5000 });
  await page.waitForTimeout(500);

  const file = path.join(OUT_DIR, 'admin-create-zone.png');
  await panel.screenshot({ path: file });
  console.log('Saved', file);
  await page.close();
}

(async () => {
  await mkdir(OUT_DIR, { recursive: true });
  const browser = await chromium.launch();
  try {
    await screenshotCreateIncident(browser);
    await screenshotCreateZone(browser);
  } finally {
    await browser.close();
  }
})();
