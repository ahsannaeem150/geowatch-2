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
  await page.goto('http://localhost:5174/login', { waitUntil: 'load' });
  await page.evaluate((t) => localStorage.setItem('geowatch_token', t), token);
  await page.goto('http://localhost:5174/?incident=32a831d7-8d6f-4db0-af9d-d815ff184a0f', { waitUntil: 'load' });
  await page.waitForSelector('.dashboard-layout', { timeout: 15000 });
  await page.locator('button[title="Incidents"]').first().click();
  await page.waitForTimeout(1000);

  // click compact
  await page.locator('button[title*="compact" i]').first().click();
  await page.waitForTimeout(1000);

  const info = await page.evaluate(() => {
    const root = document.querySelector('.dashboard-layout');
    const rail = document.querySelector('[class*="WorkspaceRail"]') || document.querySelector('button[title="Incidents"]').parentElement;
    const drawer = document.querySelector('[class*="WorkspaceDrawer"]') || document.querySelector('button[title="Close drawer"]')?.parentElement;
    const right = document.querySelector('.dashboard-right-panel');
    const topbar = document.querySelector('header');
    return {
      rootClass: root?.className,
      railWidth: rail?.getBoundingClientRect().width,
      drawerWidth: drawer?.getBoundingClientRect().width,
      drawerLeft: drawer?.getBoundingClientRect().left,
      rightWidth: right?.getBoundingClientRect().width,
      topbarHeight: topbar?.getBoundingClientRect().height,
      railComputedWidth: getComputedStyle(rail).width,
      rightComputedWidth: getComputedStyle(right).width,
      scaleValue: getComputedStyle(root).getPropertyValue('--admin-ui-scale'),
      railVar: getComputedStyle(root).getPropertyValue('--admin-rail-width'),
      rightVar: getComputedStyle(root).getPropertyValue('--admin-right-panel-width'),
    };
  });
  console.log(info);
  await browser.close();
}
main().catch(console.error);
