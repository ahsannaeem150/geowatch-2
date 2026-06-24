import { chromium } from 'playwright';

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
const page = await context.newPage();

page.on('console', (msg) => console.log(`[${msg.type()}]`, msg.text()));
page.on('pageerror', (err) => console.error('[pageerror]', err.message));

await page.goto('http://localhost:9000/verify-map-style-light.html', { waitUntil: 'networkidle' });
await page.waitForTimeout(5000);
const status = await page.locator('#status').textContent();
console.log('status:', status);
await browser.close();
