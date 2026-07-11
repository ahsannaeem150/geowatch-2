import { chromium } from 'playwright';

async function main() {
  const res = await fetch('http://localhost:3000/api/v1/auth/login', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'admin@geowatch.local', password: 'AdminPass123!' }),
  });
  const json = await res.json();
  const token = json.data.token;

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
  const errors = [];
  page.on('pageerror', (err) => errors.push(err.message));
  page.on('console', (msg) => { if (msg.type() === 'error') errors.push(msg.text()); });

  await page.goto('http://localhost:5174/login', { waitUntil: 'load' });
  await page.evaluate((t) => localStorage.setItem('geowatch_token', t), token);
  await page.goto('http://localhost:5174/', { waitUntil: 'load' });
  await page.waitForSelector('.dashboard-layout', { timeout: 15000 });

  await page.locator('button[title*="advanced search" i]').first().click();
  await page.waitForTimeout(1500);

  const visible = await page.locator('text=Power Search').first().isVisible().catch(() => false);
  console.log({ powerSearchVisible: visible, errors });
  await browser.close();
}
main().catch(console.error);
