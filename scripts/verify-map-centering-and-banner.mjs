import { chromium } from 'playwright';
import { mkdir } from 'fs/promises';
import path from 'path';

const BASE = process.env.BASE_URL || 'http://localhost:5174';
const VIEWPORT = { width: 1600, height: 900 };
const OUT_DIR = 'temp_screenshots/map-centering-verify';

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

async function getFirstMarkerScreenPosition(page) {
  // After we click the first marker, it is the selected one.
  const el = await page.locator('.maplibregl-marker').first();
  const box = await el.boundingBox();
  if (!box) return null;
  return { x: box.x + box.width / 2, y: box.y + box.height / 2 };
}

async function getVisibleMapCenter(page) {
  const box = await page.locator('.maplibregl-canvas').first().boundingBox();
  if (!box) return null;

  // The right panel is an absolute overlay. The visible map area is the canvas
  // minus the panel width when the panel is open.
  const panel = await page.locator('.dashboard-right-panel-outer').first().boundingBox().catch(() => null);
  let rightPanelWidth = 0;
  if (panel && panel.x < box.x + box.width) {
    // Panel is visible on screen; use its visible width within the canvas.
    rightPanelWidth = Math.max(0, box.x + box.width - panel.x);
  }

  return {
    x: box.x + (box.width - rightPanelWidth) / 2,
    y: box.y + box.height / 2,
  };
}

async function getMapZoom(page) {
  return page.evaluate(() => {
    const map = window.__geowatchAdminMap;
    return map ? map.getZoom() : null;
  });
}

function formatDiff(center, marker) {
  if (!center || !marker) return 'n/a';
  const dx = Math.round(marker.x - center.x);
  const dy = Math.round(marker.y - center.y);
  return `marker offset from map center: dx=${dx}px dy=${dy}px`;
}

(async () => {
  await mkdir(OUT_DIR, { recursive: true });
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: VIEWPORT });

  try {
    await login(page);

    // 1. Normal home page — click marker, right panel only.
    await clickFirstMarker(page);
    await page.locator('.dashboard-right-panel').waitFor({ state: 'visible', timeout: 5000 });
    await page.waitForTimeout(1200); // let flyTo finish
    let center = await getVisibleMapCenter(page);
    let markerPos = await getFirstMarkerScreenPosition(page);
    console.log('1. Right panel only:', formatDiff(center, markerPos));
    await screenshot(page, '01-right-panel-only');

    // 2. Open left drawer (Incidents), click the same marker again.
    await page.locator('button[title="Incidents"]').click();
    await page.waitForTimeout(500);
    await clickFirstMarker(page);
    await page.waitForTimeout(1200);
    center = await getVisibleMapCenter(page);
    markerPos = await getFirstMarkerScreenPosition(page);
    console.log('2. Left drawer + right panel:', formatDiff(center, markerPos));
    await screenshot(page, '02-left-drawer-and-right-panel');

    // 3. Close left drawer and collapse right panel.
    await page.locator('button[title="Incidents"]').click();
    await page.waitForTimeout(300);
    await page.locator('button[title="Collapse sidebar"]').first().click();
    await page.waitForTimeout(300);
    await clickFirstMarker(page);
    await page.waitForTimeout(1200);
    center = await getVisibleMapCenter(page);
    markerPos = await getFirstMarkerScreenPosition(page);
    console.log('3. No sidebars (collapsed right):', formatDiff(center, markerPos));
    await screenshot(page, '03-no-sidebars');

    // 4. Power search — open it via top bar, click a point result.
    await page.locator('button[title="Open advanced search page"]').click();
    await page.waitForFunction(() => document.querySelectorAll('.maplibregl-marker').length > 0, { timeout: 10000 });
    await page.waitForTimeout(800);
    // Click the first point result (skip zones by looking for a result without a hexagon/zone icon).
    const firstPointResult = await page.locator('text=The Strait of Hormuz opens again.').first();
    if (await firstPointResult.isVisible().catch(() => false)) {
      await firstPointResult.click();
    } else {
      await clickFirstMarker(page);
    }
    await page.locator('.dashboard-right-panel').waitFor({ state: 'visible', timeout: 5000 });
    await page.waitForTimeout(1200);
    center = await getVisibleMapCenter(page);
    markerPos = await getFirstMarkerScreenPosition(page);
    console.log('4a. Power search list + right panel (point):', formatDiff(center, markerPos));
    await screenshot(page, '04a-power-search-point');

    // 4b. Power search — click a zone result.
    const zoneResult = await page.locator('text=NONO FLY').first();
    if (await zoneResult.isVisible().catch(() => false)) {
      await zoneResult.click();
      await page.waitForTimeout(1200);
      center = await getVisibleMapCenter(page);
      // For zones, measure the center of the selected zone polygon (approximate via the SVG path).
      const zonePath = await page.locator('.zone-svg-overlay path.selected, .zone-svg-overlay path').first().boundingBox().catch(() => null);
      if (zonePath) {
        const zoneCenter = { x: zonePath.x + zonePath.width / 2, y: zonePath.y + zonePath.height / 2 };
        console.log('4b. Power search list + right panel (zone):', formatDiff(center, zoneCenter));
      }
      await screenshot(page, '04b-power-search-zone');
    }

    // 5. Ghost banner — close power search, select an incident, then change date.
    await page.locator('button[title="Back to workspace"]').click();
    await page.waitForFunction(() => document.querySelectorAll('.maplibregl-marker').length > 0, { timeout: 10000 });
    await page.waitForTimeout(500);
    await clickFirstMarker(page);
    await page.locator('.dashboard-right-panel').waitFor({ state: 'visible', timeout: 5000 });
    await page.waitForTimeout(500);
    // Set the date range to a future date so the selected incident becomes a ghost.
    const futureDate = '2026-12-31';
    const dateInputs = await page.locator('input[type="date"]').all();
    if (dateInputs.length >= 2) {
      await dateInputs[0].fill(futureDate);
      await dateInputs[1].fill(futureDate);
      await page.waitForTimeout(1200);
    }
    // The selected marker is now a ghost; the banner should appear.
    const banner = await page.locator('text=outside your current date range').first();
    const bannerVisible = await banner.isVisible().catch(() => false);
    console.log('5. Ghost banner visible:', bannerVisible);
    if (bannerVisible) {
      const bannerBox = await banner.boundingBox();
      center = await getVisibleMapCenter(page);
      const bannerCenter = bannerBox ? { x: bannerBox.x + bannerBox.width / 2, y: bannerBox.y + bannerBox.height / 2 } : null;
      if (center && bannerCenter) {
        const dx = Math.round(bannerCenter.x - center.x);
        const dy = Math.round(bannerCenter.y - center.y);
        console.log('   Banner offset from map center:', `dx=${dx}px dy=${dy}px`);
      }
    }
    await screenshot(page, '05-ghost-banner');
  } finally {
    await page.close();
    await browser.close();
  }
})();
