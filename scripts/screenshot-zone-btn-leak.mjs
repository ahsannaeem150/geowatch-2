import { chromium } from 'playwright';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');
const outDir = path.join(rootDir, 'temp_screenshots', 'zone-btn-leak-fix');

const baseUrl = 'http://localhost:5173';
const zoneId = 'b8aa6cdb-50c1-4b4c-9bc6-ccb145a70862';

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 1600, height: 1000 } });

async function newThemedPage(theme) {
  const page = await context.newPage();
  await page.goto(baseUrl, { waitUntil: 'domcontentloaded' });
  await page.evaluate(
    ({ theme }) => {
      localStorage.setItem('intelmap24-theme', theme);
      sessionStorage.setItem('intelmap24_booted', 'true');
    },
    { theme }
  );
  return page;
}

for (const theme of ['dark', 'light']) {
  const page = await newThemedPage(theme);
  await page.goto(`${baseUrl}/map?zone=${zoneId}`, { waitUntil: 'networkidle' });
  // Wait for the zone detail sidebar's Full details button
  const btn = page.getByText('Full details', { exact: false }).first();
  await btn.waitFor({ state: 'visible', timeout: 25000 });
  await page.waitForTimeout(1200);
  await page.screenshot({ path: path.join(outDir, `zone-sidebar-${theme}.png`), fullPage: false });
  console.log(`Captured zone-sidebar-${theme}.png`);

  await btn.hover();
  await page.waitForTimeout(500);
  await page.screenshot({ path: path.join(outDir, `zone-sidebar-hover-${theme}.png`), fullPage: false });
  console.log(`Captured zone-sidebar-hover-${theme}.png`);
  await page.close();
}

// Trial route still renders after lazy conversion
const page = await newThemedPage('dark');
await page.goto(`${baseUrl}/trial/zone-sidebar`, { waitUntil: 'networkidle' });
await page.waitForTimeout(2000);
await page.screenshot({ path: path.join(outDir, 'trial-zone-sidebar-dark.png'), fullPage: false });
console.log('Captured trial-zone-sidebar-dark.png');
await page.close();

await browser.close();
console.log('Screenshots saved to', outDir);
