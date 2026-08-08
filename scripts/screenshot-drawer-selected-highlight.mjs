import { chromium } from 'playwright';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');
const outDir = path.join(rootDir, 'temp_screenshots', 'drawer-selected-highlight');

const baseUrl = 'http://localhost:5173';
const token = process.env.PUBLIC_TOKEN || '';

const browser = await chromium.launch({ headless: true });

// Clicks a card title inside the open drawer. hexOnly picks a zone (polygon)
// card — identified by the Hexagon icon in its category label row.
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

// Activity rows have no line-clamped title — click the first clickable row.
async function clickFirstActivityRow(page) {
  return page.evaluate(() => {
    const drawer = [...document.querySelectorAll('div')].find(
      (d) => d.style.position === 'absolute' && d.style.left === 'var(--admin-rail-width)'
    );
    if (!drawer) return 'no-drawer';
    const rows = [...drawer.querySelectorAll('div')].filter((d) => d.style.cursor === 'pointer');
    if (!rows.length) return 'no-row';
    rows[0].click();
    return 'clicked';
  });
}

// A selected card has the accent border.
async function selectedCount(page) {
  return page.evaluate(() => {
    const drawer = [...document.querySelectorAll('div')].find(
      (d) => d.style.position === 'absolute' && d.style.left === 'var(--admin-rail-width)'
    );
    if (!drawer) return -1;
    return [...drawer.querySelectorAll('div')].filter((d) => d.style.border.includes('accent-light')).length;
  });
}

for (const theme of ['dark', 'light']) {
  // Fresh context per theme — a shared context drops public-auth restore on the second page
  const context = await browser.newContext({ viewport: { width: 1600, height: 1000 } });
  const page = await context.newPage();
  page.on('pageerror', (e) => console.log('PAGEERROR:', String(e).slice(0, 160)));
  await page.goto(baseUrl, { waitUntil: 'domcontentloaded' });
  await page.evaluate(
    ({ theme, token }) => {
      localStorage.setItem('intelmap24-theme', theme);
      sessionStorage.setItem('intelmap24_booted', 'true');
      if (token) localStorage.setItem('intelmap24_public_token', token);
    },
    { theme, token }
  );
  await page.goto(`${baseUrl}/map`, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('.maplibregl-canvas', { timeout: 25000 });
  await page.waitForTimeout(4500);
  console.log(`[${theme}] data-theme:`, await page.evaluate(() => document.documentElement.getAttribute('data-theme')));

  let authed = false;
  try {
    await page.waitForSelector('button[title="Saved"]', { timeout: 10000 });
    authed = true;
  } catch {
    console.log(`[${theme}] auth: Saved rail button never appeared`);
  }
  console.log(`[${theme}] authed:`, authed);

  // Incidents drawer — point incident selected
  await page.click('button[title="Incidents"]');
  await page.waitForTimeout(1200);
  console.log(`[${theme}] incidents click:`, await clickDrawerCard(page));
  await page.waitForTimeout(1400);
  console.log(`[${theme}] incidents selected count:`, await selectedCount(page));
  await page.screenshot({ path: path.join(outDir, `incidents-selected-${theme}.png`) });

  // Active drawer
  await page.click('button[title="Active"]');
  await page.waitForTimeout(1200);
  console.log(`[${theme}] active click:`, await clickDrawerCard(page));
  await page.waitForTimeout(1400);
  console.log(`[${theme}] active selected count:`, await selectedCount(page));
  await page.screenshot({ path: path.join(outDir, `active-selected-${theme}.png`) });

  // Activity drawer (feed may be empty — probe only)
  await page.click('button[title="Activity"]');
  await page.waitForTimeout(1200);
  const activityClick = await clickFirstActivityRow(page);
  console.log(`[${theme}] activity click:`, activityClick);
  if (activityClick === 'clicked') {
    await page.waitForTimeout(1400);
    console.log(`[${theme}] activity selected count:`, await selectedCount(page));
    await page.screenshot({ path: path.join(outDir, `activity-selected-${theme}.png`) });
  }

  // Saved drawer (needs the public token) — point card, then zone card
  if (authed) {
    await page.click('button[title="Saved"]');
    await page.waitForTimeout(1500);
    console.log(`[${theme}] saved click:`, await clickDrawerCard(page));
    await page.waitForTimeout(1400);
    console.log(`[${theme}] saved selected count:`, await selectedCount(page));
    await page.screenshot({ path: path.join(outDir, `saved-selected-${theme}.png`) });

    const zoneClick = await clickDrawerCard(page, { hexOnly: true });
    console.log(`[${theme}] saved zone-card click:`, zoneClick);
    if (zoneClick === 'clicked') {
      await page.waitForTimeout(1400);
      console.log(`[${theme}] saved zone selected count:`, await selectedCount(page));
      await page.screenshot({ path: path.join(outDir, `zone-card-selected-${theme}.png`) });
    }
  }

  await page.close();
  await context.close();
}

await browser.close();
console.log('Screenshots saved to', outDir);
