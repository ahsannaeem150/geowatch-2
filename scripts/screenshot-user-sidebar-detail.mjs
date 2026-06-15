import { chromium } from 'playwright';

const BASE = process.env.BASE_URL || 'http://localhost:5189';
const VIEWPORT = { width: 1600, height: 900 };

const shots = [
  { route: '/sidebarTrial2/userSidebarA', selector: '.usa-card', file: 'temp_screenshots/userSidebarA-detail.png' },
  { route: '/sidebarTrial2/userSidebarB', selector: '.usb-card', file: 'temp_screenshots/userSidebarB-detail.png' },
  { route: '/sidebarTrial2/userSidebarC', selector: '.usc-index-item', file: 'temp_screenshots/userSidebarC-detail.png' },
  { route: '/sidebarTrial2/userSidebarD', selector: '.usd-row', file: 'temp_screenshots/userSidebarD-detail.png' },
];

const browser = await chromium.launch();
for (const shot of shots) {
  const page = await browser.newPage({ viewport: VIEWPORT });
  await page.goto(`${BASE}${shot.route}`, { waitUntil: 'networkidle' });
  await page.click(shot.selector);
  await page.waitForTimeout(600);
  await page.screenshot({ path: shot.file, fullPage: false });
  await page.close();
  console.log('Saved', shot.file);
}
await browser.close();
