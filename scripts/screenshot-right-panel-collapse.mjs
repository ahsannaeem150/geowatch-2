import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';

const ADMIN_URL = 'http://localhost:5174';
const API_URL = 'http://localhost:3000/api/v1';
const OUT_DIR = path.resolve(process.cwd(), 'temp_screenshots', 'right-panel-collapse-verify');

async function login() {
  const res = await fetch(`${API_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'admin@geowatch.local', password: 'AdminPass123!' }),
  });
  const json = await res.json();
  return json.data.token;
}

async function getIncident(token) {
  const res = await fetch(`${API_URL}/incidents?limit=1`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const json = await res.json();
  return json.data.incidents[0];
}

async function getZoneCategory(token) {
  const res = await fetch(`${API_URL}/zone-categories`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const json = await res.json();
  const cats = json.data?.categories || json.data?.zoneCategories || [];
  return cats[0];
}

async function createPolygonZone(token, categoryId) {
  const body = {
    title: 'Screenshot Test Zone',
    description: 'Temporary polygon zone for UI verification.',
    locationContext: 'Test Area',
    severity: 3,
    status: 'active',
    verificationStatus: 'unverified',
    startDate: new Date().toISOString(),
    geometryType: 'polygon',
    geometry: {
      type: 'Polygon',
      coordinates: [
        [
          [65.0, 31.0],
          [66.0, 31.0],
          [66.0, 32.0],
          [65.0, 32.0],
          [65.0, 31.0],
        ],
      ],
    },
    zoneCategoryId: categoryId,
  };

  const res = await fetch(`${API_URL}/incidents`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(body),
  });
  const json = await res.json();
  return json.data?.incident || json.data;
}

async function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const token = await login();
  const incident = await getIncident(token);
  const zoneCategory = await getZoneCategory(token);
  let cleanupZoneId = null;
  if (zoneCategory) {
    const zone = await createPolygonZone(token, zoneCategory.id);
    cleanupZoneId = zone?.id;
  }

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });

  await page.goto(`${ADMIN_URL}/login`, { waitUntil: 'load', timeout: 15000 });
  await page.evaluate((t) => localStorage.setItem('geowatch_token', t), token);

  // 1. Incident detail right panel.
  await page.goto(`${ADMIN_URL}/?incident=${incident.id}`, { waitUntil: 'load', timeout: 15000 });
  await page.waitForSelector('.dashboard-layout', { timeout: 15000 });
  await page.waitForSelector('.dashboard-right-panel', { timeout: 10000 });
  await page.waitForTimeout(1500);
  await page.screenshot({ path: path.join(OUT_DIR, '01-incident-detail.png'), fullPage: false });

  // 2. Edit incident form collapse alignment.
  const editBtn = page.locator('button', { hasText: 'Edit incident' }).first();
  if (await editBtn.isVisible().catch(() => false)) {
    await editBtn.click();
    await page.waitForTimeout(1000);
    await page.screenshot({ path: path.join(OUT_DIR, '02-edit-incident.png'), fullPage: false });
  }

  // 3. Zone detail collapse alignment.
  if (cleanupZoneId) {
    await page.goto(`${ADMIN_URL}/?zone=${cleanupZoneId}`, { waitUntil: 'load', timeout: 15000 });
    await page.waitForSelector('.dashboard-right-panel', { timeout: 10000 });
    await page.waitForTimeout(1500);
    await page.screenshot({ path: path.join(OUT_DIR, '03-zone-detail.png'), fullPage: false });
  }

  // 4. Create incident sidebar collapse alignment.
  await page.goto(`${ADMIN_URL}/`, { waitUntil: 'load', timeout: 15000 });
  await page.waitForTimeout(500);
  const addIncidentBtn = page.locator('button', { hasText: 'Add Incident' }).first();
  if (await addIncidentBtn.isVisible().catch(() => false)) {
    await addIncidentBtn.click();
    await page.waitForTimeout(1000);
    await page.screenshot({ path: path.join(OUT_DIR, '04-create-incident.png'), fullPage: false });
  }

  // 5. Create zone sidebar collapse alignment.
  // Enter draw mode, draw a triangle, close it, then save to open the create zone sidebar.
  const addZoneBtn = page.locator('button', { hasText: 'Add Zone' }).first();
  if (await addZoneBtn.isVisible().catch(() => false)) {
    await addZoneBtn.click();
    await page.waitForTimeout(800);
    await page.mouse.click(900, 520);
    await page.waitForTimeout(200);
    await page.mouse.click(900, 620);
    await page.waitForTimeout(200);
    await page.mouse.click(1000, 620);
    await page.waitForTimeout(200);
    await page.mouse.dblclick(900, 520);
    await page.waitForTimeout(800);

    const saveBtn = page.locator('button', { hasText: 'Save' }).first();
    if (await saveBtn.isVisible().catch(() => false) && await saveBtn.isEnabled().catch(() => false)) {
      await saveBtn.click();
      await page.waitForSelector('.zone-create-sidebar', { timeout: 5000 });
      await page.waitForTimeout(1000);
      await page.screenshot({ path: path.join(OUT_DIR, '05-create-zone.png'), fullPage: false });
    }
  }

  await browser.close();

  // Clean up the temporary polygon zone.
  if (cleanupZoneId) {
    try {
      await fetch(`${API_URL}/incidents/${cleanupZoneId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
    } catch {
      // ignore cleanup errors
    }
  }

  console.log(`Screenshots saved to ${OUT_DIR}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
