import { chromium } from 'playwright';
import { existsSync, mkdirSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const OUT = join(ROOT, 'screenshots', 'showcase-feature-captures');

const USER_BASE = 'http://localhost:5173';
const ADMIN_BASE = 'http://localhost:5174';
const VIEWPORT = { width: 1920, height: 1080 };

const INCIDENT_ID = '477fc53b-3530-4cf9-806c-85eac8e02290';
const ZONE_ID = '3f9fdd45-d2ca-4a9d-a0de-852cff1f3be7';
const ARCHIVED_XPOST_INCIDENT_ID = 'b9fc6bf4-63b3-44b8-818d-97c05be77803';
const ADMIN_EMAIL = 'admin@geowatch.local';
const ADMIN_PASSWORD = 'AdminPass123!';

function ensureDir(d) {
  if (!existsSync(d)) mkdirSync(d, { recursive: true });
}

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

async function loginAdmin(page) {
  await page.goto(`${ADMIN_BASE}/login`);
  await page.fill('input[type="email"]', ADMIN_EMAIL);
  await page.fill('input[type="password"]', ADMIN_PASSWORD);
  await page.click('button[type="submit"]');
  await page.waitForURL(/^(http:\/\/localhost:5174\/?)$/, { timeout: 15000 });
  await page.waitForTimeout(1200);
}

ensureDir(join(OUT, 'user-web'));
ensureDir(join(OUT, 'map'));
ensureDir(join(OUT, 'incident-detail'));
ensureDir(join(OUT, 'admin-curation'));

(async () => {
  const browser = await chromium.launch();

  // 1. About page
  console.log('\n=== About page ===');
  {
    const page = await browser.newPage({ viewport: VIEWPORT });
    await page.goto(`${USER_BASE}/about`);
    await setTheme(page, 'dark', 'tactical');
    await page.reload({ waitUntil: 'networkidle' });
    await screenshot(page, join(OUT, 'user-web', 'about-page.png'), 1500);
    await page.close();
  }

  // 2. Map context menu (right click on empty map)
  console.log('\n=== Map context menu ===');
  {
    const page = await browser.newPage({ viewport: VIEWPORT });
    await page.goto(`${USER_BASE}/map`);
    await setTheme(page, 'dark', 'tactical');
    await page.reload({ waitUntil: 'networkidle' });
    await waitForMapLoad(page);
    await page.mouse.click(960, 540, { button: 'right' });
    await screenshot(page, join(OUT, 'map', 'map-context-menu-empty.png'), 600);
    await page.close();
  }

  // 3. Date picker open
  console.log('\n=== Date picker ===');
  {
    const page = await browser.newPage({ viewport: VIEWPORT });
    await page.goto(`${USER_BASE}/map`);
    await setTheme(page, 'dark', 'tactical');
    await page.reload({ waitUntil: 'networkidle' });
    await waitForMapLoad(page);
    // Click on a date input to open picker
    const dateInputs = await page.locator('input[type="date"], input[type="text"]').all();
    for (const input of dateInputs) {
      const type = await input.getAttribute('type').catch(() => '');
      if (type === 'date') {
        await input.click();
        await screenshot(page, join(OUT, 'map', 'map-date-picker-open.png'), 600);
        break;
      }
    }
    await page.close();
  }

  // 4. Archived X-post fallback detail page
  console.log('\n=== Archived X-post fallback ===');
  {
    const page = await browser.newPage({ viewport: VIEWPORT });
    await page.goto(`${USER_BASE}/incident/${ARCHIVED_XPOST_INCIDENT_ID}`);
    await setTheme(page, 'dark', 'tactical');
    await page.reload({ waitUntil: 'networkidle' });
    await screenshot(page, join(OUT, 'incident-detail', 'incident-detail-archived-xpost.png'), 2500);
    // Scroll to sources/x-posts section
    await page.evaluate(() => window.scrollTo(0, 900));
    await screenshot(page, join(OUT, 'incident-detail', 'incident-detail-archived-xpost-sources.png'));
    await page.close();
  }

  // 5. Admin: incident detail with media tab open
  console.log('\n=== Admin media gallery ===');
  {
    const page = await browser.newPage({ viewport: VIEWPORT });
    await loginAdmin(page);
    await page.goto(`${ADMIN_BASE}/incident/${INCIDENT_ID}`);
    await page.waitForTimeout(2000);

    // Click Media tab if exists
    const mediaTab = page.locator('button').filter({ hasText: 'Media' }).first();
    if (await mediaTab.isVisible().catch(() => false)) {
      await mediaTab.click();
      await screenshot(page, join(OUT, 'admin-curation', 'admin-incident-media-gallery.png'), 1200);
    }

    // Click X Posts tab
    const xpostsTab = page.locator('button').filter({ hasText: /X Posts|X posts/ }).first();
    if (await xpostsTab.isVisible().catch(() => false)) {
      await xpostsTab.click();
      await screenshot(page, join(OUT, 'admin-curation', 'admin-incident-xposts-tab.png'), 1200);
    }

    // Click Edit incident
    const editBtn = page.locator('button').filter({ hasText: 'Edit incident' }).first();
    if (await editBtn.isVisible().catch(() => false)) {
      await editBtn.click();
      await screenshot(page, join(OUT, 'admin-curation', 'admin-edit-incident-form.png'), 1200);
      // Close modal by pressing Escape
      await page.keyboard.press('Escape');
      await page.waitForTimeout(400);
    }

    // Click Add update
    const addUpdateBtn = page.locator('button').filter({ hasText: 'Add update' }).first();
    if (await addUpdateBtn.isVisible().catch(() => false)) {
      await addUpdateBtn.click();
      await screenshot(page, join(OUT, 'admin-curation', 'admin-add-update-modal.png'), 1200);
    }

    await page.close();
  }

  // 6. Admin search modal
  console.log('\n=== Admin search modal ===');
  {
    const page = await browser.newPage({ viewport: VIEWPORT });
    await loginAdmin(page);
    // Try common search triggers
    const searchTriggers = [
      'button[title*="Search"]',
      'button:has-text("Search")',
      'input[placeholder*="Search"]',
    ];
    for (const sel of searchTriggers) {
      const el = page.locator(sel).first();
      if (await el.isVisible().catch(() => false)) {
        await el.click();
        await screenshot(page, join(OUT, 'admin-curation', 'admin-search-modal.png'), 1000);
        break;
      }
    }
    await page.close();
  }

  // 7. Admin zone detail with polygon editing
  console.log('\n=== Admin zone editing ===');
  {
    const page = await browser.newPage({ viewport: VIEWPORT });
    await loginAdmin(page);
    await page.goto(`${ADMIN_BASE}/incident/${ZONE_ID}`);
    await page.waitForTimeout(2500);
    await screenshot(page, join(OUT, 'admin-curation', 'admin-zone-detail-editing.png'), 1000);
    await page.close();
  }

  await browser.close();
  console.log('\n=== Supplementary captures complete ===');
})();
