import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';

const ADMIN_URL = 'http://localhost:5174';
const API_URL = 'http://localhost:3000/api/v1';
const OUT_DIR = path.resolve(process.cwd(), 'temp_screenshots', 'compact-verify');

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

async function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const token = await login();
  const incident = await getIncident(token);

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });

  // Set token so the dashboard is authenticated.
  await page.goto(`${ADMIN_URL}/login`, { waitUntil: 'load', timeout: 15000 });
  await page.evaluate((t) => localStorage.setItem('geowatch_token', t), token);

  // Open dashboard with an incident pre-selected (right panel) and left drawer open.
  await page.goto(`${ADMIN_URL}/?incident=${incident.id}`, { waitUntil: 'load', timeout: 15000 });
  await page.waitForSelector('.dashboard-layout', { timeout: 15000 });

  // Open the "Incidents" rail drawer.
  const incidentsButton = page.locator('button[title="Incidents"]').first();
  if (await incidentsButton.isVisible().catch(() => false)) {
    await incidentsButton.click();
    await page.waitForTimeout(500);
  }

  // Wait for the right panel to render.
  await page.waitForSelector('.dashboard-right-panel', { timeout: 10000 });
  await page.waitForTimeout(1500);

  // Open an update/evidence drawer so we can verify it doesn't clip in compact mode.
  const inspectBtn = page.locator('button', { hasText: 'Inspect' }).first();
  if (await inspectBtn.isVisible().catch(() => false)) {
    await inspectBtn.click();
    await page.waitForSelector('.id-drawer', { timeout: 5000 });
    await page.waitForTimeout(800);
  }

  // Normal mode screenshot.
  await page.screenshot({ path: path.join(OUT_DIR, 'admin-normal.png'), fullPage: false });

  // Toggle compact mode.
  const compactBtn = page.locator('button[title*="compact" i]').first();
  if (await compactBtn.isVisible().catch(() => false)) {
    await compactBtn.click();
    await page.waitForTimeout(1500);
    await page.screenshot({ path: path.join(OUT_DIR, 'admin-compact.png'), fullPage: false });
  } else {
    console.warn('Compact toggle not found');
  }

  // Also capture Power Search normal/compact.
  const advancedBtn = page.locator('button[title*="advanced search" i]').first();
  if (await advancedBtn.isVisible().catch(() => false)) {
    await advancedBtn.click();
    await page.waitForTimeout(1500);
    await page.screenshot({ path: path.join(OUT_DIR, 'admin-powersearch-compact.png'), fullPage: false });

    // Turn compact off while in power search.
    const compactBtn2 = page.locator('button[title*="compact" i]').first();
    if (await compactBtn2.isVisible().catch(() => false)) {
      await compactBtn2.click();
      await page.waitForTimeout(1500);
      await page.screenshot({ path: path.join(OUT_DIR, 'admin-powersearch-normal.png'), fullPage: false });
    }
  }

  await browser.close();
  console.log(`Screenshots saved to ${OUT_DIR}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
