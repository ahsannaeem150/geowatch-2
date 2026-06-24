import { chromium } from 'playwright';
import { existsSync, mkdirSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const OUT = join(ROOT, 'temp_screenshots', 'verify-theme');

if (!existsSync(OUT)) mkdirSync(OUT, { recursive: true });

const SUPER_BASE = 'http://localhost:5175';
const VIEWPORT = { width: 1440, height: 900 };

async function main() {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: VIEWPORT });

  page.on('console', (msg) => {
    if (msg.type() === 'error') console.log(`[${msg.type()}]`, msg.text());
  });
  page.on('pageerror', (err) => console.error('[page error]', err.message));

  await page.goto(`${SUPER_BASE}/login`, { waitUntil: 'networkidle' });
  await page.fill('input[type="email"]', 'admin@geowatch.local');
  await page.fill('input[type="password"]', 'AdminPass123!');
  await page.click('button[type="submit"]');
  await page.waitForURL(`${SUPER_BASE}/superadmin`, { timeout: 10000 });

  await page.goto(`${SUPER_BASE}/superadmin/domains`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);

  // Click edit on first domain
  const editBtn = page.locator('button[title="Edit domain"]').first();
  await editBtn.click();
  await page.waitForTimeout(500);

  await page.screenshot({ path: join(OUT, 'superadmin-domain-modal.png') });
  console.log('Saved', join(OUT, 'superadmin-domain-modal.png'));

  await browser.close();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
