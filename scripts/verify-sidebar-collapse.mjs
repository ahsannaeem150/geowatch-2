import { chromium } from 'playwright';

const BASE = process.env.BASE_URL || 'http://localhost:5173';
const VIEWPORT = { width: 1600, height: 900 };

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: VIEWPORT });

await page.goto(`${BASE}/map?zoom=4&lat=22.5&lng=77.5`, { waitUntil: 'networkidle' });
await page.waitForTimeout(2000);

// Before collapse
await page.screenshot({ path: 'temp_screenshots/user-map-sidebar-open.png', fullPage: false });
console.log('Saved user-map-sidebar-open.png');

// Collapse sidebar
await page.click('[title="Collapse events sidebar"]');
await page.waitForTimeout(600);
// Trigger a small resize just in case
await page.screenshot({ path: 'temp_screenshots/user-map-sidebar-collapsed.png', fullPage: false });
console.log('Saved user-map-sidebar-collapsed.png');

await browser.close();
