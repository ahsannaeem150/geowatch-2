import { chromium } from 'playwright';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');
const outDir = path.join(rootDir, 'temp_screenshots', 'logo-fix');

const baseUrl = 'http://localhost:5173';
const incidentId = 'b8aa6cdb-50c1-4b4c-9bc6-ccb145a70862';

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 1600, height: 1000 } });
const page = await context.newPage();

await page.goto(baseUrl, { waitUntil: 'domcontentloaded' });
await page.evaluate(() => {
  localStorage.setItem('intelmap24-theme', 'dark');
  sessionStorage.setItem('intelmap24_booted', 'true');
});
await page.goto(`${baseUrl}/incident/${incidentId}`, { waitUntil: 'networkidle' });
await page.waitForTimeout(1800);

// Logged-out Save click opens the sign-in modal
await page.getByText('Save', { exact: true }).first().click();
await page.waitForTimeout(900);
await page.screenshot({ path: path.join(outDir, 'signin-modal-dark.png'), fullPage: false });
console.log('Captured signin-modal-dark.png');

await browser.close();
