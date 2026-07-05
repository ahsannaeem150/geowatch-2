import { chromium } from 'playwright';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');
const outDir = path.join(rootDir, 'temp_screenshots', 'verify-theme');

const baseUrl = process.env.PREVIEW_URL || 'http://localhost:4173';
const style = 'tactical';

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 1600, height: 1000 } });

async function capture(route, theme, name, interactions = []) {
  const page = await context.newPage();
  await page.goto(baseUrl, { waitUntil: 'domcontentloaded' });
  await page.evaluate(
    ({ theme, style }) => {
      localStorage.setItem('geowatch-theme', theme);
      localStorage.setItem('geowatch-style', style);
    },
    { theme, style }
  );
  await page.goto(`${baseUrl}${route}`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);
  for (const step of interactions) {
    if (step.click) await page.locator(`[title="${step.click}"]`).first().click();
    if (step.clickText) await page.getByText(step.clickText, { exact: true }).first().click();
    if (step.clickSelector) await page.locator(step.clickSelector).first().click();
    await page.waitForTimeout(step.wait || 600);
  }
  const fileName = `trial-${name}-${theme}.png`;
  await page.screenshot({ path: path.join(outDir, fileName), fullPage: false });
  console.log(`Captured ${fileName}`);
  await page.close();
}

const scenarios = [
  { route: '/trial/map-workspace-a', name: 'map-workspace-a-default' },
  { route: '/trial/map-workspace-a', name: 'map-workspace-a-layers', interactions: [{ click: 'Layers', wait: 800 }] },
  { route: '/trial/map-workspace-a', name: 'map-workspace-a-settings', interactions: [{ click: 'Settings', wait: 800 }] },
  { route: '/trial/map-workspace-a', name: 'map-workspace-a-panel', interactions: [{ clickText: 'Show Panel', wait: 800 }] },
  { route: '/trial/power-search', name: 'power-search-default' },
  { route: '/trial/power-search', name: 'power-search-detail', interactions: [{ clickText: 'Maritime alert: Red Sea corridor', wait: 800 }] },
  { route: '/trial/layer-drawer-options', name: 'layer-drawer-options' },
];

for (const theme of ['dark', 'light']) {
  for (const s of scenarios) {
    await capture(s.route, theme, s.name, s.interactions || []);
  }
}

await browser.close();
console.log('Screenshots saved to', outDir);
