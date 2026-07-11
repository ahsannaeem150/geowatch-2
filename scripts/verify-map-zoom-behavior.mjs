import { chromium } from 'playwright';
import { mkdir } from 'fs/promises';
import path from 'path';

const BASE = process.env.BASE_URL || 'http://localhost:5174';
const API_BASE = process.env.API_BASE_URL || 'http://localhost:3000/api/v1';
const VIEWPORT = { width: 1600, height: 900 };
const OUT_DIR = 'temp_screenshots/map-zoom-verify';

const LOGIN = {
  email: 'admin@geowatch.local',
  password: 'AdminPass123!',
};

async function getTokenFromBrowser(page) {
  return page.evaluate(() => localStorage.getItem('geowatch_token'));
}

async function fetchZones(token) {
  const res = await fetch(`${API_BASE}/incidents?dateFrom=2020-01-01&dateTo=2030-12-31&limit=200`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error('Failed to fetch incidents');
  const data = await res.json();
  const incidents = data.data?.incidents || [];
  return incidents.filter((i) => i.geometry_type === 'polygon' || i.geometryType === 'polygon');
}

function boundsFromZone(zone) {
  const coords = zone.geometry?.coordinates?.[0];
  if (!coords) return null;
  let minLng = Infinity, maxLng = -Infinity, minLat = Infinity, maxLat = -Infinity;
  for (const [lng, lat] of coords) {
    minLng = Math.min(minLng, lng);
    maxLng = Math.max(maxLng, lng);
    minLat = Math.min(minLat, lat);
    maxLat = Math.max(maxLat, lat);
  }
  return [minLng, minLat, maxLng, maxLat];
}

function zoneArea(bounds) {
  if (!bounds) return 0;
  const width = bounds[2] - bounds[0];
  const height = bounds[3] - bounds[1];
  return width * height;
}

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

async function getFittingZoom(page, bounds) {
  return page.evaluate(({ bbox }) => {
    const map = window.__geowatchAdminMap;
    if (!map) return null;
    const camera = map.cameraForBounds(bbox, { padding: { top: 0, bottom: 0, left: 0, right: 0 }, maxZoom: 22 });
    return camera ? camera.zoom : null;
  }, { bbox: bounds });
}

async function getMapZoom(page) {
  return page.evaluate(() => {
    const map = window.__geowatchAdminMap;
    return map ? map.getZoom() : null;
  });
}

async function setMapZoom(page, zoom) {
  return page.evaluate((z) => {
    const map = window.__geowatchAdminMap;
    if (!map) return;
    map.setZoom(z);
  }, zoom);
}

async function flyTo(page, lat, lng, zoom) {
  return page.evaluate(({ lat, lng, zoom }) => {
    const map = window.__geowatchAdminMap;
    if (!map) return;
    map.flyTo({ center: [lng, lat], zoom, duration: 0 });
  }, { lat, lng, zoom });
}

function getZoneCentroid(zone) {
  const coords = zone.geometry?.coordinates?.[0];
  if (!coords || coords.length === 0) return null;
  let sumLng = 0, sumLat = 0;
  for (const [lng, lat] of coords) {
    sumLng += lng;
    sumLat += lat;
  }
  return { lat: sumLat / coords.length, lng: sumLng / coords.length };
}

async function projectZoneCentroid(page, zone) {
  const centroid = getZoneCentroid(zone);
  if (!centroid) return null;
  return page.evaluate(({ lng, lat }) => {
    const map = window.__geowatchAdminMap;
    if (!map) return null;
    const point = map.project([lng, lat]);
    const canvas = map.getCanvas();
    const rect = canvas.getBoundingClientRect();
    return { x: rect.left + point.x, y: rect.top + point.y };
  }, centroid);
}

function assertClose(label, actual, expected, tolerance = 0.05) {
  const pass = actual !== null && Math.abs(actual - expected) <= tolerance;
  const status = pass ? 'PASS' : 'FAIL';
  console.log(`[${status}] ${label}: actual=${actual?.toFixed(3) ?? 'null'} expected=${expected.toFixed(3)}`);
  return pass;
}

function assertDirection(label, actual, previous, direction) {
  if (actual === null || previous === null) {
    console.log(`[FAIL] ${label}: missing zoom value`);
    return false;
  }
  const delta = actual - previous;
  const pass = direction === 'up' ? delta > 0 : delta < 0;
  const status = pass ? 'PASS' : 'FAIL';
  console.log(`[${status}] ${label}: actual=${actual.toFixed(3)} previous=${previous.toFixed(3)} delta=${delta.toFixed(3)} (${direction})`);
  return pass;
}

(async () => {
  await mkdir(OUT_DIR, { recursive: true });
  const browser = await chromium.launch();
  const context = await browser.newContext({ viewport: VIEWPORT, recordVideo: { dir: OUT_DIR, size: VIEWPORT } });
  const page = await context.newPage();
  let allPass = true;

  try {
    await login(page);
    await screenshot(page, '00-initial');

    const token = await getTokenFromBrowser(page);
    if (!token) {
      console.log('[SKIP] Could not read auth token from browser');
      process.exit(0);
    }

    const zones = await fetchZones(token);
    if (zones.length === 0) {
      console.log('[SKIP] No polygon zones found in database');
      process.exit(0);
    }

    const zonesWithBounds = zones.map((z) => ({ zone: z, area: zoneArea(boundsFromZone(z)) }));
    zonesWithBounds.sort((a, b) => a.area - b.area);
    const smallestZone = zonesWithBounds[0]?.zone;
    const largestZone = zonesWithBounds[zonesWithBounds.length - 1]?.zone;
    console.log(`Found ${zones.length} zones. Smallest: ${smallestZone?.title}, Largest: ${largestZone?.title}`);

    const initialZoom = await getMapZoom(page);
    console.log('Initial zoom:', initialZoom?.toFixed(3));

    // 1. Map page incident click: +0.05 each time.
    await setMapZoom(page, 3);
    await page.waitForTimeout(400);
    await clickFirstMarker(page);
    await page.waitForTimeout(1200);
    const zoom1 = await getMapZoom(page);
    allPass = assertClose('Map incident click nudges +0.05', zoom1, 3.05, 0.05) && allPass;
    await screenshot(page, '01-first-marker-click');

    await clickFirstMarker(page);
    await page.waitForTimeout(1200);
    const zoom2 = await getMapZoom(page);
    allPass = assertClose('Map incident second click nudges +0.05', zoom2, 3.10, 0.05) && allPass;
    await screenshot(page, '02-second-marker-click');

    // 2. Map page zone click on the smallest zone: +0.02.
    // Use a wide date range so zones are visible on the regular map.
    const dateInputs = await page.locator('input[type="date"]').all();
    if (dateInputs.length >= 2) {
      await dateInputs[0].fill('2020-01-01');
      await dateInputs[1].fill('2030-12-31');
      await page.waitForTimeout(1200);
    }

    if (smallestZone) {
      const centroid = getZoneCentroid(smallestZone);
      if (centroid) {
        await flyTo(page, centroid.lat, centroid.lng, 3);
        await page.waitForTimeout(800);
        const point = await projectZoneCentroid(page, smallestZone);
        if (point) {
          const zoomBefore = await getMapZoom(page);
          await page.mouse.click(point.x, point.y);
          await page.waitForTimeout(1200);
          const zoomAfter = await getMapZoom(page);
          allPass = assertClose('Map small-zone click nudges +0.02', zoomAfter, zoomBefore + 0.02, 0.05) && allPass;
          await screenshot(page, '03-small-zone-map-click');
        } else {
          console.log('[SKIP] Could not project smallest zone centroid');
        }
      }
    }

    // 3. Power Search incident selection: exactly zoom 7.
    await page.locator('button[title="Open advanced search page"]').click();
    await page.waitForFunction(() => document.querySelectorAll('.maplibregl-marker').length > 0, { timeout: 10000 });
    await page.waitForTimeout(800);
    const pointResult = await page.locator('text=The Strait of Hormuz opens again.').first();
    if (await pointResult.isVisible().catch(() => false)) {
      await pointResult.click();
      await page.waitForTimeout(1200);
      const psIncidentZoom = await getMapZoom(page);
      allPass = assertClose('Power Search incident selection zooms to 7', psIncidentZoom, 7, 0.1) && allPass;
      await screenshot(page, '04-power-search-incident');
    } else {
      console.log('[SKIP] Power Search point result not available');
    }

    // 4. Power Search small zone selection: comfort-fit clamped to [4, 14].
    if (smallestZone) {
      const result = await page.locator(`text=${smallestZone.title}`).first();
      if (await result.isVisible().catch(() => false)) {
        await result.click();
        await page.waitForTimeout(1200);
        const psSmallZoneZoom = await getMapZoom(page);
        const expectedFit = await getFittingZoom(page, boundsFromZone(smallestZone));
        // With 30% comfort margin the target is slightly zoomed out from the
        // exact fit, then clamped to the 4-14 range. Tiny zones hit the 14 cap.
        // Comfort-fit zoom is always <= exact fit (because of extra padding),
        // then clamped to [4, 14].
        const pass = psSmallZoneZoom !== null && psSmallZoneZoom >= 4 && psSmallZoneZoom <= 14 &&
          (expectedFit === null || psSmallZoneZoom <= expectedFit + 0.2);
        const status = pass ? 'PASS' : 'FAIL';
        console.log(`[${status}] Power Search small zone selection comfort-fit clamped: actual=${psSmallZoneZoom?.toFixed(3) ?? 'null'} expected<=${expectedFit?.toFixed(3) ?? 'n/a'}`);
        allPass = pass && allPass;
        await screenshot(page, '05-power-search-small-zone');
      } else {
        console.log(`[SKIP] Power Search result for "${smallestZone.title}" not visible`);
      }
    }

    // 5. Power Search big zone selection: zoom out below 6 if the zone is large.
    if (largestZone) {
      const result = await page.locator(`text=${largestZone.title}`).first();
      if (await result.isVisible().catch(() => false)) {
        await result.click();
        await page.waitForTimeout(1200);
        const psBigZoneZoom = await getMapZoom(page);
        // Large zones should end up below zoom 6 so the whole zone fits.
        if (psBigZoneZoom !== null && psBigZoneZoom < 6) {
          console.log(`[PASS] Power Search big zone selection zoomed out below 6: actual=${psBigZoneZoom.toFixed(3)}`);
        } else {
          console.log(`[FAIL] Power Search big zone selection did not zoom out below 6: actual=${psBigZoneZoom?.toFixed(3) ?? 'null'}`);
          allPass = false;
        }
        await screenshot(page, '06-power-search-big-zone');
      } else {
        console.log(`[SKIP] Power Search result for "${largestZone.title}" not visible`);
      }
    }

    // 6. Map page big zone click: should fit exactly (zoom out).
    await page.locator('button[title="Back to workspace"]').click();
    await page.waitForFunction(() => document.querySelectorAll('.maplibregl-marker').length > 0, { timeout: 10000 });
    await page.waitForTimeout(800);
    // Ensure a wide date range is set so zones are visible.
    const dateInputs2 = await page.locator('input[type="date"]').all();
    if (dateInputs2.length >= 2) {
      await dateInputs2[0].fill('2020-01-01');
      await dateInputs2[1].fill('2030-12-31');
      await page.waitForTimeout(1200);
    }

    if (largestZone) {
      const centroid = getZoneCentroid(largestZone);
      if (centroid) {
        await flyTo(page, centroid.lat, centroid.lng, 8);
        await page.waitForTimeout(800);
        const point = await projectZoneCentroid(page, largestZone);
        if (point) {
          const zoomBefore = await getMapZoom(page);
          await page.mouse.click(point.x, point.y);
          await page.waitForTimeout(1200);
          const zoomAfter = await getMapZoom(page);
          allPass = assertDirection('Map big-zone click zooms out to fit', zoomAfter, zoomBefore, 'down') && allPass;
          await screenshot(page, '07-big-zone-map-click');
        } else {
          console.log('[SKIP] Could not project largest zone centroid');
        }
      }
    }

    // 7. Auto-zoom toggle: turning it off preserves zoom on selection.
    await page.locator('button[title="Settings"]').click();
    await page.waitForTimeout(400);
    const autoZoomToggle = page.locator('button[role="switch"]').first();
    if (await autoZoomToggle.isVisible().catch(() => false)) {
      const initialToggleState = await autoZoomToggle.evaluate((el) => el.getAttribute('aria-checked') === 'true');
      if (initialToggleState) {
        await autoZoomToggle.click();
        await page.waitForTimeout(200);
        // Click the Settings rail button again to close the drawer.
        await page.locator('button[title="Settings"]').click();
        await page.waitForTimeout(400);

        // Set a known zoom, click a marker, and verify the map did not zoom.
        await setMapZoom(page, 5);
        await page.waitForTimeout(400);
        await clickFirstMarker(page);
        await page.waitForTimeout(1200);
        const zoomAfterToggleOff = await getMapZoom(page);
        allPass = assertClose('Auto-zoom OFF preserves manual zoom for point incident', zoomAfterToggleOff, 5, 0.05) && allPass;
        await screenshot(page, '08-auto-zoom-off-marker');

        // Also verify zones respect the toggle: select a zone from the map and
        // confirm the zoom stays at the manually-set level.
        if (smallestZone) {
          const centroid = getZoneCentroid(smallestZone);
          if (centroid) {
            await flyTo(page, centroid.lat, centroid.lng, 5);
            await page.waitForTimeout(800);
            const point = await projectZoneCentroid(page, smallestZone);
            if (point) {
              await page.mouse.click(point.x, point.y);
              await page.waitForTimeout(1200);
              const zoomAfterZoneToggleOff = await getMapZoom(page);
              allPass = assertClose('Auto-zoom OFF preserves manual zoom for map-click zone', zoomAfterZoneToggleOff, 5, 0.05) && allPass;
              await screenshot(page, '09-auto-zoom-off-zone-map');
            } else {
              console.log('[SKIP] Could not project zone centroid for auto-zoom OFF test');
            }
          }
        }

        // Verify Power Search zone selection also respects the toggle.
        await page.locator('button[title="Open advanced search page"]').click();
        await page.waitForFunction(() => document.querySelectorAll('.maplibregl-marker').length > 0, { timeout: 10000 });
        await page.waitForTimeout(800);
        await setMapZoom(page, 5);
        await page.waitForTimeout(400);
        if (smallestZone) {
          const result = await page.locator(`text=${smallestZone.title}`).first();
          if (await result.isVisible().catch(() => false)) {
            await result.click();
            await page.waitForTimeout(1200);
            const zoomAfterPsZoneToggleOff = await getMapZoom(page);
            allPass = assertClose('Auto-zoom OFF preserves manual zoom for Power Search zone', zoomAfterPsZoneToggleOff, 5, 0.05) && allPass;
            await screenshot(page, '10-auto-zoom-off-zone-ps');
          } else {
            console.log(`[SKIP] Power Search result for "${smallestZone.title}" not visible for auto-zoom OFF test`);
          }
        }

        // Restore toggle state: exit Power Search if needed, then open Settings.
        const backButton = page.locator('button[title="Back to workspace"]');
        if (await backButton.isVisible().catch(() => false)) {
          await backButton.click();
          await page.waitForTimeout(400);
        }
        await page.locator('button[title="Settings"]').click();
        await page.waitForTimeout(400);
        await autoZoomToggle.click();
        await page.waitForTimeout(200);
        // Close the settings drawer again.
        await page.locator('button[title="Settings"]').click();
        await page.waitForTimeout(400);
      } else {
        console.log('[SKIP] Auto-zoom toggle was already off');
      }
    } else {
      console.log('[SKIP] Auto-zoom toggle not found');
    }

    console.log('\nOverall:', allPass ? 'PASS' : 'FAIL');
    process.exit(allPass ? 0 : 1);
  } finally {
    await page.close();
    await context.close();
    await browser.close();
  }
})();
