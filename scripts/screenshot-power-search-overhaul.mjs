import { chromium } from 'playwright';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');
const outDir = path.join(rootDir, 'temp_screenshots', 'power-search-overhaul');

const baseUrl = 'http://localhost:5173';

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 1600, height: 1000 } });

const page = await context.newPage();
await page.goto(baseUrl, { waitUntil: 'domcontentloaded' });
await page.evaluate(() => {
  localStorage.setItem('intelmap24-theme', 'dark');
  sessionStorage.setItem('intelmap24_booted', 'true');
});

await page.goto(`${baseUrl}/map`, { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(4500); // let map + first-visit peek settle

// (a) TopBar brand cluster + hover-revealed nav
const brandBtn = page.locator('button[title*="IntelMap24 home"]').first();
await brandBtn.waitFor({ state: 'visible', timeout: 20000 });
await brandBtn.hover();
await page.waitForTimeout(900); // 175ms hover-intent + staggered reveal
await page.screenshot({ path: path.join(outDir, 'a-topbar-brand-hover-nav.png') });
console.log('Captured a-topbar-brand-hover-nav.png');

// Open Power Search via the topbar Advanced-search trigger (⌘K button opens the palette)
await page.locator('button[title="Open advanced search page"]').first().click();
await page.waitForTimeout(2500); // panel mount + debounced search + fetch

// (b) Incident card + zone card (results rail, default newest/active)
await page.screenshot({ path: path.join(outDir, 'b-results-incident-and-zone-cards.png') });
console.log('Captured b-results-incident-and-zone-cards.png');

// (d) Filter rail new order (Type → Date → Incident/Zone/State groups)
await page.screenshot({ path: path.join(outDir, 'd-filter-rail-order.png') });
console.log('Captured d-filter-rail-order.png');

// (c) Selected highlight — click the first result card
await page.evaluate(() => {
  const sortBtn = [...document.querySelectorAll('button')].find((b) => b.textContent.includes('Newest first'));
  const railHeader = sortBtn?.closest('div')?.parentElement?.parentElement; // results rail container
  const list = railHeader?.querySelector(':scope > div:last-child');
  list?.querySelector(':scope > div > div')?.click();
});
await page.waitForTimeout(1200);
await page.screenshot({ path: path.join(outDir, 'c-selected-card-highlight.png') });
console.log('Captured c-selected-card-highlight.png');

// Helper: click the nth row of a FilterSection by its title
async function clickRowOfSection(title, index = 0) {
  await page.evaluate(
    ({ t, i }) => {
      const secBtn = [...document.querySelectorAll('button')].find((b) => b.textContent.trim() === t);
      const content = secBtn?.nextElementSibling;
      const labels = content ? [...content.querySelectorAll('label')] : [];
      labels[i]?.click();
    },
    { t: title, i: index }
  );
}

// (e) Zone-category filter filtering (2nd category — the first has 0 active zones)
await clickRowOfSection('Zone categories', 1);
await page.waitForTimeout(2000);
await page.screenshot({ path: path.join(outDir, 'e-zone-category-filter.png') });
console.log('Captured e-zone-category-filter.png');
await clickRowOfSection('Zone categories', 1); // deselect
await page.waitForTimeout(1500);

// (f) Domain filter does not hide zones — toggle first domain checkbox
// (wrapper div > header row div > checkbox wrapper span)
await page.evaluate(() => {
  const secBtn = [...document.querySelectorAll('button')].find((b) => b.textContent.trim().startsWith('Domains & Categories'));
  const firstDomainRowHeader = secBtn?.nextElementSibling?.querySelector(':scope > div > div > div');
  firstDomainRowHeader?.firstElementChild?.click();
});
await page.waitForTimeout(2000);
await page.screenshot({ path: path.join(outDir, 'f-domain-filter-keeps-zones.png') });
console.log('Captured f-domain-filter-keeps-zones.png');

await browser.close();
console.log('Screenshots saved to', outDir);
