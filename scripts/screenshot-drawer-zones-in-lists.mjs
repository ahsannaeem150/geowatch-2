import { chromium } from 'playwright';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');
const outDir = path.join(rootDir, 'temp_screenshots', 'drawer-zones-in-lists');

const baseUrl = 'http://localhost:5173';
const browser = await chromium.launch({ headless: true });

async function clickDrawerCard(page, { hexOnly = false } = {}) {
  return page.evaluate(({ hexOnly }) => {
    const drawer = [...document.querySelectorAll('div')].find(
      (d) => d.style.position === 'absolute' && d.style.left === 'var(--admin-rail-width)'
    );
    if (!drawer) return 'no-drawer';
    const titles = [...drawer.querySelectorAll('div')].filter((d) => d.style.webkitLineClamp === '2');
    let pick = null;
    if (hexOnly) {
      pick = titles.find((t) => {
        let node = t;
        for (let i = 0; i < 4 && node; i += 1) {
          if (node.querySelector && node.querySelector('svg.lucide-hexagon')) return true;
          node = node.parentElement;
        }
        return false;
      });
    } else {
      pick = titles[0];
    }
    if (!pick) return 'no-card';
    pick.click();
    return 'clicked';
  }, { hexOnly });
}

async function drawerStats(page) {
  return page.evaluate(() => {
    const drawer = [...document.querySelectorAll('div')].find(
      (d) => d.style.position === 'absolute' && d.style.left === 'var(--admin-rail-width)'
    );
    if (!drawer) return null;
    const zoneCards = drawer.querySelectorAll('svg.lucide-hexagon').length;
    const selected = [...drawer.querySelectorAll('div')].filter((d) => d.style.border.includes('accent-light')).length;
    const header = drawer.querySelector('div span')?.textContent?.trim();
    return { zoneCards, selected, header };
  });
}

for (const theme of ['dark', 'light']) {
  const context = await browser.newContext({ viewport: { width: 1600, height: 1000 } });
  const page = await context.newPage();
  page.on('pageerror', (e) => console.log('PAGEERROR:', String(e).slice(0, 160)));
  await page.goto(baseUrl, { waitUntil: 'domcontentloaded' });
  await page.evaluate((theme) => {
    localStorage.setItem('intelmap24-theme', theme);
    sessionStorage.setItem('intelmap24_booted', 'true');
  }, theme);
  await page.goto(`${baseUrl}/map`, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('.maplibregl-canvas', { timeout: 25000 });
  await page.waitForTimeout(4500);

  // In Viewport drawer — mixed point + zone cards
  await page.click('button[title="Incidents"]');
  await page.waitForTimeout(1500);
  console.log(`[${theme}] viewport stats:`, JSON.stringify(await drawerStats(page)));
  await page.screenshot({ path: path.join(outDir, `viewport-mixed-${theme}.png`) });

  // Select a zone card → highlight + sidebar/fly
  console.log(`[${theme}] viewport zone click:`, await clickDrawerCard(page, { hexOnly: true }));
  await page.waitForTimeout(1500);
  console.log(`[${theme}] viewport after select:`, JSON.stringify(await drawerStats(page)));
  await page.screenshot({ path: path.join(outDir, `viewport-zone-selected-${theme}.png`) });

  // Active drawer — includes active zones
  await page.click('button[title="Active"]');
  await page.waitForTimeout(1500);
  console.log(`[${theme}] active stats:`, JSON.stringify(await drawerStats(page)));
  await page.screenshot({ path: path.join(outDir, `active-with-zone-${theme}.png`) });

  await context.close();
}

await browser.close();
console.log('Screenshots saved to', outDir);
