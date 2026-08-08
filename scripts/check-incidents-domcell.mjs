import { chromium } from 'playwright';

// One-off check: does the longest real category name fit the new two-line
// Domain/Category cell on /incidents (220px column)?
async function main() {
  const res = await fetch('http://localhost:3100/api/v1/auth/login', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'admin@geowatch.local', password: 'AdminPass123!' }),
  });
  const json = await res.json();
  const token = json.data.token;

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1600, height: 900 } });
  await page.goto('http://localhost:5174/login', { waitUntil: 'load' });
  await page.evaluate((t) => localStorage.setItem('intelmap24_token', t), token);
  await page.goto('http://localhost:5174/incidents', { waitUntil: 'load' });
  await page.waitForSelector('.tui-table tbody tr.tui-row', { timeout: 15000 });

  // Search for the incident titled "4" (carries the 34-char category)
  await page.fill('.tui-search-input', '4');
  await page.waitForTimeout(1200);

  const cells = await page.evaluate(() => {
    return Array.from(document.querySelectorAll('.ip-domcat')).map((el) => ({
      text: el.textContent,
      len: el.textContent.length,
      client: el.clientWidth,
      scroll: el.scrollWidth,
      truncated: el.scrollWidth > el.clientWidth + 1,
      tooltip: el.closest('.ip-domcell')?.getAttribute('title') || '',
    }));
  });
  console.log(JSON.stringify(cells, null, 2));
  await browser.close();
}
main().catch((e) => { console.error(e); process.exit(1); });
