import { chromium } from 'playwright';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.resolve(__dirname, '../temp_screenshots/verify-theme');

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
const page = await context.newPage();

page.on('console', (msg) => console.log(`[console ${msg.type()}]`, msg.text()));
page.on('pageerror', (err) => console.error('[page error]', err.message));

const url = 'http://localhost:9000/verify-map-style-light.html';
await page.goto(url, { waitUntil: 'networkidle' });
await page.waitForSelector('#status:has-text("Light style loaded")', { timeout: 30000 });

const shots = [
  { zoom: 3, center: [69.3451, 30.3753], name: 'verify-map-style-light-z3.png' },
  { zoom: 4, center: [69.3451, 30.3753], name: 'verify-map-style-light-z4.png' },
  { zoom: 7, center: [74.5, 28.5], name: 'verify-map-style-light-z7.png' },
  { zoom: 13, center: [77.2, 28.6], name: 'verify-map-style-light-z13.png' },
];

for (const shot of shots) {
  await page.evaluate((s) => window.map.flyTo({ center: s.center, zoom: s.zoom, duration: 0 }), shot);
  await page.waitForTimeout(3000);
  await page.screenshot({ path: path.join(outDir, shot.name), fullPage: false });
  console.log('Saved', shot.name);
}

await browser.close();
