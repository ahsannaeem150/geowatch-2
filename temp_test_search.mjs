import { chromium } from 'playwright';

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1400, height: 900 } });
  const page = await context.newPage();

  await page.goto('http://localhost:5174/login');
  await page.fill('input[type="email"], input[name="email"]', 'admin@geowatch.local');
  await page.fill('input[type="password"], input[name="password"]', 'AdminPass123!');
  await page.click('button[type="submit"]');
  await page.waitForURL(/^(?!.*login).*$/, { timeout: 10000 });
  await page.waitForTimeout(3000);

  // Open search modal via top bar trigger
  await page.click('button[title="Search incidents (⌘K)"]');
  await page.waitForTimeout(300);
  await page.fill('input[placeholder*="Search incidents across all time"]', 'Hormuz');
  await page.waitForTimeout(300);
  await page.keyboard.type('Hormuz');
  await page.waitForTimeout(1500);
  await page.screenshot({ path: 'temp_screenshots/search_modal_hormuz.png' });

  // Open /search page via Advanced button? It currently opens modal. Navigate directly.
  await page.goto('http://localhost:5174/search');
  await page.waitForTimeout(2000);
  await page.screenshot({ path: 'temp_screenshots/power_search.png' });

  await browser.close();
})();
