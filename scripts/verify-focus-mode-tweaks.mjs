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

async function waitForFocusLabel(page, label) {
  await page.waitForFunction(
    (expected) => {
      const btn = document.querySelector('button[title="Toggle focus mode"]');
      return btn && btn.textContent.trim() === expected;
    },
    label,
    { timeout: 5000 }
  );
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

async function enterFocusMode(page) {
  const btn = page.locator('button[title="Toggle focus mode"]');
  await btn.click();
  await waitForFocusLabel(page, 'Exit Focus');
  await page.locator('.dashboard-right-panel').waitFor({ state: 'hidden', timeout: 3000 });
  await page.waitForTimeout(400);
}

(async () => {
  await mkdir(OUT_DIR, { recursive: true });
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: VIEWPORT });

  try {
    await login(page);

    // Open both sidebars
    await clickFirstMarker(page);
    await page.locator('.dashboard-right-panel').waitFor({ state: 'visible', timeout: 5000 });
    await page.locator('button[title="Incidents"]').click();
    await page.waitForTimeout(500);

    // Enter focus mode -> both sidebars should hide
    await enterFocusMode(page);
    await screenshot(page, 'admin-focus-mode-both-hidden');

    // Click left rail icon -> only left drawer should open, right stays hidden, focus off
    await page.locator('button[title="Layers"]').click();
    await waitForFocusLabel(page, 'Focus');
    await page.waitForTimeout(500);
    const rightHiddenAfterDrawer = await page.locator('.dashboard-right-panel').isHidden();
    console.log('Right panel hidden after drawer open:', rightHiddenAfterDrawer);
    await screenshot(page, 'admin-focus-mode-only-drawer-opens');

    // Re-enter focus mode
    await enterFocusMode(page);

    // Click incident marker -> only right panel should open, left drawer hidden, focus off
    await clickFirstMarker(page);
    await waitForFocusLabel(page, 'Focus');
    await page.locator('.dashboard-right-panel').waitFor({ state: 'visible', timeout: 5000 });
    await page.waitForTimeout(400);
    // Drawer should be hidden (the drawer container is only rendered when activeDrawer is set)
    const drawerHidden = await page.locator('text=Incidents in Viewport').isHidden().catch(() => true);
    console.log('Left drawer hidden after incident click:', drawerHidden);
    const file = path.join(OUT_DIR, 'admin-focus-mode-only-right-opens.png');
    await page.locator('.dashboard-right-panel').screenshot({ path: file });
    console.log('Saved', file);
  } finally {
    await page.close();
    await browser.close();
  }
})();
