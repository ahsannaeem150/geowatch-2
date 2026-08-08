import { chromium } from 'playwright';

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

const state = () =>
  page.evaluate(() => {
    const chipsBar = [...document.querySelectorAll('span')].find((s) => s.textContent.trim() === 'Filters' && s.closest('div')?.style?.overflowX === 'auto');
    const chips = [...document.querySelectorAll('button')]
      .filter((b) => b.closest('div')?.style?.overflowX === 'auto')
      .map((b) => b.textContent.trim())
      .filter((t) => t && t !== 'Reset');
    const sortBtn = [...document.querySelectorAll('button')].find((b) => b.textContent.includes('first') || b.textContent.includes('Relevance') || b.textContent.includes('A–Z'));
    const rail = sortBtn?.closest('div')?.parentElement?.parentElement;
    const list = rail?.querySelector(':scope > div:last-child > div');
    const cards = list ? [...list.children].filter((el) => el.style?.cursor === 'pointer') : [];
    const selected = cards.filter((el) => el.style.border.includes('accent-light')).length;
    const zoneCards = cards.filter((el) => el.querySelector('svg.lucide-hexagon')).length;
    const countLabel = rail?.querySelector('span')?.textContent?.trim();
    return { chips, cards: cards.length, selected, zoneCards, countLabel, sortLabel: sortBtn?.textContent?.trim() };
  });

console.log('initial:', JSON.stringify(await state()));

// Click first card → selected highlight
await page.evaluate(() => {
  const sortBtn = [...document.querySelectorAll('button')].find((b) => b.textContent.includes('first'));
  const rail = sortBtn?.closest('div')?.parentElement?.parentElement;
  rail?.querySelector(':scope > div:last-child > div > div')?.click();
});
await page.waitForTimeout(1200);
console.log('after select:', JSON.stringify(await state()));

// Toggle 2nd zone category (NOTAM, the first, has 0 active zones)
await page.evaluate(() => {
  const secBtn = [...document.querySelectorAll('button')].find((b) => b.textContent.trim() === 'Zone categories');
  secBtn?.nextElementSibling?.querySelectorAll('label')?.[1]?.click();
});
await page.waitForTimeout(2000);
console.log('after zone-cat:', JSON.stringify(await state()));

// Deselect zone category, toggle first domain
await page.evaluate(() => {
  const secBtn = [...document.querySelectorAll('button')].find((b) => b.textContent.trim() === 'Zone categories');
  secBtn?.nextElementSibling?.querySelectorAll('label')?.[1]?.click();
});
await page.waitForTimeout(1500);
await page.evaluate(() => {
  const secBtn = [...document.querySelectorAll('button')].find((b) => b.textContent.trim().startsWith('Domains & Categories'));
  const header = secBtn?.nextElementSibling?.querySelector(':scope > div > div > div');
  header?.firstElementChild?.click();
});
await page.waitForTimeout(2000);
console.log('after domain:', JSON.stringify(await state()));

await browser.close();
