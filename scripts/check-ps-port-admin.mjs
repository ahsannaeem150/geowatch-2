// PS-port admin verification: DOM checks + 3 screenshots (dark PS, dark drawer, light PS).
import { chromium } from 'playwright';
import { mkdirSync } from 'fs';

const OUT = 'temp_screenshots/ps-port-admin';
mkdirSync(OUT, { recursive: true });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const results = [];
const check = (name, ok, extra = '') => {
  results.push([name, ok]);
  console.log(`${ok ? 'PASS' : 'FAIL'} ${name}${extra ? ' — ' + extra : ''}`);
};

async function openPowerSearch(page) {
  await page.goto('http://localhost:5174/', { waitUntil: 'domcontentloaded' });
  await sleep(4500);
  await page.click('button[title="Open advanced search page"]');
  await sleep(1800);
}

const browser = await chromium.launch();
try {
  const login = await fetch('http://localhost:3100/api/v1/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'admin@geowatch.local', password: 'AdminPass123!' }),
  }).then((r) => r.json());
  const token = login?.data?.token;
  if (!token) throw new Error('admin login failed: ' + (login?.message || 'no token'));

  // ─── Dark page: all DOM checks + 2 screenshots ───
  const page = await browser.newPage({ viewport: { width: 1600, height: 900 } });
  await page.addInitScript((tok) => {
    localStorage.setItem('intelmap24_token', tok);
    localStorage.setItem('intelmap24-theme', 'dark');
  }, token);
  const searchUrls = [];
  page.on('request', (req) => {
    const u = req.url();
    if (u.includes('/incidents/search')) searchUrls.push(u);
  });
  await openPowerSearch(page);

  // CHECK 1a: "Zone categories" filter section rendered in the rail
  const zcHeader = page.locator('button:has-text("Zone categories")').first();
  check('zone-categories section visible', await zcHeader.count() > 0);

  // CHECK 1b: toggling a zone category sends zoneCategoryIds param
  searchUrls.length = 0;
  const firstZcLabel = page.locator('xpath=//button[contains(.,"Zone categories")]/following-sibling::div//label[1]');
  await firstZcLabel.click();
  await sleep(1600);
  check('zoneCategoryIds param sent', searchUrls.some((u) => u.includes('zoneCategoryIds=')), searchUrls.find((u) => u.includes('zoneCategoryIds='))?.split('zoneCategoryIds=')[1]?.slice(0, 8) || 'none');

  // CHECK 2: zone result card renders hexagon glyph + category name
  await page.click('button:has-text("Polygon / Zone")');
  await sleep(1800);
  const saveBtn = page.locator('button[title="Save"], button[title="Unsave"]').first();
  const card = saveBtn.locator('xpath=ancestor::div[3]');
  check('zone card present', await card.count() > 0);
  const hexCount = await card.locator('svg.lucide-hexagon').count();
  check('zone card hexagon glyph', hexCount > 0, `hexagons=${hexCount}`);

  // CHECK 3: clicking a PS card gives it the accent border (selected)
  await card.click();
  await sleep(1500);
  const cardAfter = page.locator('button[title="Save"], button[title="Unsave"]').first().locator('xpath=ancestor::div[3]');
  const psBorder = await cardAfter.evaluate((el) => el.style.border + '|' + el.style.background);
  check('PS selected card accent border', psBorder.includes('--accent-light') && psBorder.includes('--accent-subtle-bg'), psBorder.slice(0, 70));
  await page.screenshot({ path: `${OUT}/ps-cards-dark.png` });
  console.log('saved ps-cards-dark.png');

  // CHECK 4: drawer selected row accent (Incidents drawer)
  await page.click('button[title="Back to workspace"]');
  await sleep(1200);
  const railBtn = page.locator('button[title="Incidents"]').first();
  if (await railBtn.count()) await railBtn.click();
  else await page.locator('button:has-text("Incidents")').first().click();
  await sleep(1500);
  const drawerRowsXpath = '//span[text()="Incidents in Viewport"]/ancestor::div[2]//div[contains(@style,"cursor: pointer")]';
  const drawerRow = page.locator(`xpath=${drawerRowsXpath}`).first();
  check('drawer rows present', await drawerRow.count() > 0);
  await drawerRow.evaluate((el) => el.click());
  await sleep(1500);
  const rowAfter = page.locator(`xpath=${drawerRowsXpath}`).first();
  const rowStyle = await rowAfter.evaluate((el) => el.style.border + '|' + el.style.background);
  check('drawer selected row accent border', rowStyle.includes('--accent-light') && rowStyle.includes('--accent-subtle-bg'), rowStyle.slice(0, 70));
  await page.screenshot({ path: `${OUT}/drawer-selected-dark.png` });
  console.log('saved drawer-selected-dark.png');
  await page.close();

  // ─── Light page: 1 screenshot ───
  const light = await browser.newPage({ viewport: { width: 1600, height: 900 } });
  await light.addInitScript((tok) => {
    localStorage.setItem('intelmap24_token', tok);
    localStorage.setItem('intelmap24-theme', 'light');
  }, token);
  await openPowerSearch(light);
  await light.click('button:has-text("Polygon / Zone")');
  await sleep(1800);
  await light.screenshot({ path: `${OUT}/ps-cards-light.png` });
  console.log('saved ps-cards-light.png');
  await light.close();
} finally {
  await browser.close();
}
const failed = results.filter(([, ok]) => !ok);
console.log(failed.length === 0 ? `ALL ${results.length} CHECKS PASSED` : `${failed.length} CHECK(S) FAILED`);
process.exit(failed.length === 0 ? 0 : 1);
