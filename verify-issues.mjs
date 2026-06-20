import { chromium } from 'playwright';
import { mkdirSync } from 'fs';

const OUT = './temp_screenshots/verify';
mkdirSync(OUT, { recursive: true });

const ADMIN = 'http://localhost:5174';
const USER = 'http://localhost:5173';
const EMAIL = 'admin@geowatch.local';
const PASS = 'AdminPass123!';
const INCIDENT_WITH_MEDIA = '3a3e438e-b258-4395-8cf2-566b361ae15b';

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 1400, height: 900 } });

async function loginAdmin(page) {
  await page.goto(`${ADMIN}/login`);
  await page.fill('input[type="email"], input[name="email"]', EMAIL);
  await page.fill('input[type="password"], input[name="password"]', PASS);
  await page.click('button[type="submit"]');
  await page.waitForURL((url) => url.pathname !== '/login', { timeout: 15000 });
  await page.waitForTimeout(2500);
}

// ── Issue 1: media images should be visible ────────────────────────────────
{
  const page = await context.newPage();
  await loginAdmin(page);
  await page.goto(`${ADMIN}/incident/${INCIDENT_WITH_MEDIA}`);
  await page.waitForTimeout(2500);

  const imgs = await page.$$eval('img', (list) =>
    list
      .filter((img) => img.src && img.src.includes('/uploads/'))
      .map((img) => ({ src: img.src, naturalWidth: img.naturalWidth, complete: img.complete }))
  );
  console.log('[MEDIA] upload images found:', imgs.length);
  imgs.forEach((i) => console.log('  ', i.src, 'width=', i.naturalWidth, 'complete=', i.complete));

  const broken = imgs.filter((i) => i.naturalWidth === 0);
  console.log('[MEDIA] broken images:', broken.length);
  await page.screenshot({ path: `${OUT}/admin-incident-media.png`, fullPage: true });
  await page.close();
}

// ── Issue 3: trial zone evidence modal width / embed fit ───────────────────
{
  const page = await context.newPage();
  await page.goto(`${USER}/trial/zone`);
  await page.waitForTimeout(1500);

  // Open the first timeline update via its Inspect button
  const inspectBtn = await page.$('.zone-timeline-event .id-btn-ghost');
  console.log('[TRIAL] inspect button found:', !!inspectBtn);
  if (inspectBtn) {
    await inspectBtn.click();
    await page.waitForTimeout(2500);

    const modal = await page.$('.zone-modal.zone-modal--evidence');
    const box = modal ? await modal.boundingBox() : null;
    console.log('[TRIAL] modal bounding box:', box);

    // Expand the X post to verify embedded tweet fits
    const openAll = await page.$('text=Open all');
    if (openAll) {
      await openAll.click().catch(() => {});
      await page.waitForTimeout(500);
    }
    const xItem = await page.$('.id-x-compact__item');
    if (xItem) {
      await xItem.click().catch(() => {});
      await page.waitForTimeout(2000);
    }

    const embedW = await page.$eval('.id-x-embed', (el) => {
      const rect = el.getBoundingClientRect();
      return { width: rect.width, height: rect.height, overflowX: el.scrollWidth > el.clientWidth };
    }).catch(() => null);
    console.log('[TRIAL] X embed dimensions:', embedW);

    await page.screenshot({ path: `${OUT}/trial-zone-modal.png` });
  }
  await page.close();
}

await browser.close();
console.log('Verification screenshots saved to', OUT);
