// Drawer redesign v5 screenshots — card chrome + spine restored, severity removed.
import { chromium } from 'playwright';
const BASE = 'http://localhost:5174';
const STATE = 'temp_screenshots/ui-sweep-admin/auth-state.json';
const SHOTS = 'temp_screenshots/drawer-redesign-v5';

const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({ storageState: STATE, viewport: { width: 1440, height: 900 } });
const page = await ctx.newPage();
page.on('pageerror', (e) => console.log('PAGEERROR:', String(e).slice(0, 200)));
await page.goto(BASE + '/', { waitUntil: 'domcontentloaded' });
await page.waitForSelector('.maplibregl-canvas', { timeout: 25000 });
await page.waitForTimeout(5000);

const theme = () => page.evaluate(() => document.documentElement.getAttribute('data-theme'));
async function toggleTheme() {
  await page.click('button[title="Settings"]');
  await page.waitForTimeout(900);
  await page.locator('button[title="Switch to light mode"], button[title="Switch to dark mode"]').first().click();
  await page.waitForTimeout(1800);
}

// Measure: zero severity signals, card chrome + spine present, 24H+ x uniform,
// row-2 right slot (time) right-edge x uniform across cards
async function measure() {
  return page.evaluate(() => {
    const sevCount = document.querySelectorAll('span[title^="Severity "]').length;
    const cards = [...document.querySelectorAll('div')].filter(
      (d) => d.style.background === 'var(--bg-input)' && d.style.borderRadius === 'var(--radius-md)' && d.style.border.includes('var(--border-default)')
    );
    const spines = [...document.querySelectorAll('div')].filter((d) => d.style.marginLeft === '-11px' && d.style.alignSelf === 'stretch');
    const flags = [...document.querySelectorAll('span[title="Active for more than 24 hours"]')].map((s) => Math.round(s.getBoundingClientRect().x));
    const timeSlots = [...document.querySelectorAll('span')].filter((s) => s.style.minWidth.includes('26px') && s.style.textAlign === 'right')
      .map((s) => Math.round(s.getBoundingClientRect().right));
    return { sevCount, cardCount: cards.length, spineCount: spines.length, flagXs: flags, timeRightXs: timeSlots };
  });
}

// 1. Active — dark
await page.click('button[title="Active"]');
await page.waitForTimeout(1200);
console.log('active (dark):', JSON.stringify(await measure()));
await page.screenshot({ path: `${SHOTS}/active-dark.png`, timeout: 10000, animations: 'disabled' });
console.log('shot active-dark', await theme());

// 2. Active — light
await toggleTheme();
await page.click('button[title="Active"]');
await page.waitForTimeout(1200);
console.log('active (light):', JSON.stringify(await measure()));
await page.screenshot({ path: `${SHOTS}/active-light.png`, timeout: 10000, animations: 'disabled' });
console.log('shot active-light', await theme());

// 3. Saved — light
await page.click('button[title="Saved"]');
await page.waitForTimeout(1200);
console.log('saved (light):', JSON.stringify(await measure()));
await page.screenshot({ path: `${SHOTS}/saved-light.png`, timeout: 10000, animations: 'disabled' });
console.log('shot saved-light', await theme());

// 4. Saved — dark
await toggleTheme();
await page.click('button[title="Saved"]');
await page.waitForTimeout(1200);
console.log('saved (dark):', JSON.stringify(await measure()));
await page.screenshot({ path: `${SHOTS}/saved-dark.png`, timeout: 10000, animations: 'disabled' });
console.log('shot saved-dark', await theme());

await browser.close();
