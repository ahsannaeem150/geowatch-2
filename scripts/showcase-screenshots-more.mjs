import { chromium } from 'playwright';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const OUT = join(ROOT, 'screenshots', 'showcase-feature-captures');

const USER_BASE = 'http://localhost:5173';
const VIEWPORT = { width: 1920, height: 1080 };
const INCIDENT_ID = '477fc53b-3530-4cf9-806c-85eac8e02290';

async function setTheme(page, theme = 'dark', style = 'tactical') {
  await page.evaluate(
    ({ theme, style }) => {
      localStorage.setItem('geowatch-theme', theme);
      localStorage.setItem('geowatch-style', style);
    },
    { theme, style }
  );
}

async function screenshot(page, path, wait = 800) {
  await page.waitForTimeout(wait);
  await page.screenshot({ path });
  console.log('Saved', path);
}

async function waitForMapLoad(page) {
  await page.waitForSelector('.maplibregl-canvas', { timeout: 20000 }).catch(() => {});
  await page.waitForTimeout(1500);
}

(async () => {
  const browser = await chromium.launch();

  // Date picker open
  console.log('\n=== Date picker ===');
  {
    const page = await browser.newPage({ viewport: VIEWPORT });
    await page.goto(`${USER_BASE}/map`);
    await setTheme(page, 'dark', 'tactical');
    await page.reload({ waitUntil: 'networkidle' });
    await waitForMapLoad(page);
    // Click the "From" date picker trigger (the one with ▼)
    const triggers = await page.locator('div').filter({ hasText: /From/ }).all();
    for (const t of triggers) {
      const text = await t.textContent().catch(() => '');
      if (text.includes('From') && text.includes('▼')) {
        await t.click();
        break;
      }
    }
    await screenshot(page, join(OUT, 'map', 'map-date-picker-open.png'), 700);
    await page.close();
  }

  // Context menu on incident marker
  console.log('\n=== Marker context menu ===');
  {
    const page = await browser.newPage({ viewport: VIEWPORT });
    await page.goto(`${USER_BASE}/map?incident=${INCIDENT_ID}&lat=26.897114&lng=55.906013&zoom=6.66`);
    await setTheme(page, 'dark', 'tactical');
    await page.reload({ waitUntil: 'networkidle' });
    await waitForMapLoad(page);
    await page.waitForTimeout(2000);
    // Right-click on the incident marker (approximate location in viewport center-ish)
    await page.mouse.click(960, 600, { button: 'right' });
    await screenshot(page, join(OUT, 'map', 'map-context-menu-marker.png'), 600);
    await page.close();
  }

  // Saved incidents tab (UI only, not authenticated)
  console.log('\n=== Saved tab UI ===');
  {
    const page = await browser.newPage({ viewport: VIEWPORT });
    await page.goto(`${USER_BASE}/map?incident=${INCIDENT_ID}&lat=26.897114&lng=55.906013&zoom=6.66`);
    await setTheme(page, 'dark', 'tactical');
    await page.reload({ waitUntil: 'networkidle' });
    await waitForMapLoad(page);
    // Look for Saved tab in sidebar
    const savedTab = page.locator('button').filter({ hasText: /Saved/ }).first();
    if (await savedTab.isVisible().catch(() => false)) {
      await savedTab.click();
      await screenshot(page, join(OUT, 'map', 'map-saved-tab.png'), 1000);
    }
    await page.close();
  }

  await browser.close();
  console.log('\n=== More captures complete ===');
})();
