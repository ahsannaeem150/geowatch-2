import { chromium } from 'playwright';
import fs from 'node:fs';

const OUT = 'temp_screenshots/ps-port-superadmin';
const AUTH = 'temp_screenshots/ui-sweep-superadmin/auth-state.json';
fs.mkdirSync(OUT, { recursive: true });

const results = [];
const check = (name, ok, extra = '') => {
  results.push(`${ok ? 'PASS' : 'FAIL'} ${name}${extra ? ` — ${extra}` : ''}`);
};

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({
  ...(fs.existsSync(AUTH) ? { storageState: AUTH } : {}),
  viewport: { width: 1600, height: 950 },
});
const page = await context.newPage();
await page.goto('http://localhost:5175/superadmin/map', { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(2000);
if (page.url().includes('/login')) {
  await page.fill('input[type="email"]', 'admin@geowatch.local');
  await page.fill('input[type="password"]', 'AdminPass123!');
  await page.click('button[type="submit"]');
  await page.waitForURL('**/superadmin**', { timeout: 15000 });
  await context.storageState({ path: AUTH });
  await page.goto('http://localhost:5175/superadmin/map', { waitUntil: 'domcontentloaded' });
}
await page.waitForSelector('button[title="Open advanced search page"]', { timeout: 25000 });
await page.waitForTimeout(1500);

// ─── Open Power Search ───
await page.click('button[title="Open advanced search page"]');
await page.waitForSelector('text=Explore everything', { timeout: 10000 });
await page.waitForResponse((r) => r.url().includes('/incidents/search'), { timeout: 15000 }).catch(() => {});
await page.waitForTimeout(1200);

// 1. Zone categories filter section present
const zoneSection = page.locator('xpath=//button[contains(.,"Zone categories")]');
check('zone-category-section', (await zoneSection.count()) > 0);

// 2. Toggling a zone category sends zoneCategoryIds param
let paramOk = false;
const zcRow = page.locator('xpath=//button[contains(.,"Zone categories")]/following-sibling::div//label').first();
if (await zcRow.count()) {
  const [req] = await Promise.all([
    page.waitForRequest((r) => r.url().includes('/incidents/search'), { timeout: 8000 }).catch(() => null),
    zcRow.click(),
  ]);
  paramOk = !!req && req.url().includes('zoneCategoryIds=');
  await page.waitForTimeout(900);
}
check('zone-category-param', paramOk);

// toggle back off to restore full results
if (paramOk) {
  await zcRow.click();
  await page.waitForTimeout(900);
}

// 3. Zone card renders hexagon glyph + category name, no severity chip
const zoneCardInfo = await page.evaluate(() => {
  const cards = [...document.querySelectorAll('div')].filter(
    (d) => d.style.cursor === 'pointer' && d.querySelector('button[title="Save"], button[title="Unsave"]')
  );
  const zone = cards.find((c) => c.querySelector('svg.lucide-hexagon'));
  if (!zone) return { found: false, total: cards.length };
  const label = zone.querySelector('svg.lucide-hexagon')?.parentElement?.textContent?.trim() || '';
  const sevChip = [...zone.querySelectorAll('span')].some((s) => /^S\d$/.test(s.textContent.trim()));
  return { found: true, total: cards.length, label, sevChip };
});
check('zone-card-glyph', zoneCardInfo.found && !zoneCardInfo.sevChip, JSON.stringify(zoneCardInfo));

// scroll filter rail so Zone categories is visible, then shot 1
await page.evaluate(() => {
  const btn = [...document.querySelectorAll('.pw-filter-scroll button')].find((b) => b.textContent.includes('Zone categories'));
  btn?.scrollIntoView({ block: 'center' });
});
await page.waitForTimeout(400);
await page.screenshot({ path: `${OUT}/1-ps-rail-cards.png` });

// 4. Select first result card → accent border + subtle bg
const selectedOk = await page.evaluate(() => {
  const cards = [...document.querySelectorAll('div')].filter(
    (d) => d.style.cursor === 'pointer' && d.querySelector('button[title="Save"], button[title="Unsave"]')
  );
  if (!cards.length) return false;
  cards[0].click();
  return true;
});
await page.waitForTimeout(1200);
const psSelected = await page.evaluate(() => {
  const cards = [...document.querySelectorAll('div')].filter(
    (d) => d.style.cursor === 'pointer' && d.querySelector('button[title="Save"], button[title="Unsave"]')
  );
  const sel = cards.find((c) => c.style.border.includes('var(--accent-light)'));
  return !!sel && sel.style.background.includes('var(--accent-subtle-bg)');
});
check('ps-selected-highlight', selectedOk && psSelected);
await page.screenshot({ path: `${OUT}/2-ps-selected.png` });

// ─── Close PS, open Incidents drawer ───
await page.click('button[title="Back to workspace"]');
await page.waitForTimeout(800);
const railBtn = page.locator('button[title="Incidents"]').first();
if (await railBtn.count()) await railBtn.click();
else await page.click('text=Incidents');
await page.waitForTimeout(1200);

// 5. Drawer shows selected row (fall back: click first row, then re-check)
let drawerSel = await page.evaluate(() =>
  [...document.querySelectorAll('div')].some(
    (d) => d.style.cursor === 'pointer' && d.style.border.includes('var(--accent-light)') && d.querySelector('svg.lucide-map-pin')
  )
);
if (!drawerSel) {
  await page.evaluate(() => {
    const rows = [...document.querySelectorAll('div')].filter(
      (d) => d.style.cursor === 'pointer' && d.querySelector('svg.lucide-map-pin') && d.style.border.includes('1px solid')
    );
    rows[0]?.click();
  });
  await page.waitForTimeout(1000);
  drawerSel = await page.evaluate(() =>
    [...document.querySelectorAll('div')].some(
      (d) => d.style.cursor === 'pointer' && d.style.border.includes('var(--accent-light)') && d.querySelector('svg.lucide-map-pin')
    )
  );
}
check('drawer-selected-highlight', drawerSel);

// light theme shot (flip attribute for a static capture, then restore)
await page.evaluate(() => document.documentElement.setAttribute('data-theme', 'light'));
await page.waitForTimeout(500);
await page.screenshot({ path: `${OUT}/3-drawer-selected-light.png` });
await page.evaluate(() => document.documentElement.setAttribute('data-theme', 'dark'));

console.log(results.join('\n'));
await browser.close();
