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
await page.waitForTimeout(4000);

await page.locator('button[title="Open advanced search page"]').first().click();
await page.waitForTimeout(2500);

// (b update) Default active-only view — cards show green dot + "Active"
await page.screenshot({ path: path.join(outDir, 'b-results-incident-and-zone-cards.png') });
console.log('Captured b-results-incident-and-zone-cards.png');

// Enable Resolved too → rail shows active cards (with "Active") and resolved cards (no badge)
await page.evaluate(() => {
  const secBtn = [...document.querySelectorAll('button')].find((b) => b.textContent.trim() === 'Status');
  const pill = [...(secBtn?.nextElementSibling?.querySelectorAll('button') || [])].find((b) => b.textContent.trim() === 'Resolved');
  pill?.click();
});
await page.waitForTimeout(2000);

const check = await page.evaluate(() => {
  const sortBtn = [...document.querySelectorAll('button')].find((b) => b.textContent.includes('Newest first'));
  const rail = sortBtn?.closest('div')?.parentElement?.parentElement;
  const column = rail?.querySelector(':scope > div:last-child > div');
  const cards = column ? [...column.children].filter((el) => el.style?.cursor === 'pointer') : [];
  const withActive = cards.filter((el) => el.textContent.includes('· Active') || /·\s*Active/.test(el.textContent)).length;
  const withResolvedText = cards.filter((el) => el.textContent.includes('Resolved')).length;
  const noStatus = cards.filter((el) => !el.textContent.includes('Active') && !el.textContent.includes('Resolved')).length;
  return { cards: cards.length, withActive, withResolvedText, noStatus };
});
console.log('card status check:', JSON.stringify(check));

await page.screenshot({ path: path.join(outDir, 'b2-status-active-vs-resolved.png') });
console.log('Captured b2-status-active-vs-resolved.png');

await browser.close();
console.log('Screenshots saved to', outDir);
