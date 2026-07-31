import { chromium } from 'playwright';

// One-off check: does the superadmin workspace top bar fit after adding the
// Incidents/Zones buttons + slim mode? Usage: node scripts/check-superadmin-topbar-fit.mjs [width]
async function main() {
  const res = await fetch('http://localhost:3100/api/v1/auth/login', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'admin@geowatch.local', password: 'AdminPass123!' }),
  });
  const json = await res.json();
  const token = json.data.token;

  const width = Number(process.argv[2]) || 1280;
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width, height: 800 } });
  await page.goto('http://localhost:5175/login', { waitUntil: 'load' });
  await page.evaluate((t) => localStorage.setItem('superadmin_token', t), token);
  await page.goto('http://localhost:5175/superadmin/map', { waitUntil: 'load' });
  await page.waitForSelector('header', { timeout: 20000 });
  await page.waitForTimeout(1500);

  const info = await page.evaluate((w) => {
    const header = document.querySelector('header');
    if (!header) return { error: 'no header found' };
    const groups = Array.from(header.children).map((el) => {
      const r = el.getBoundingClientRect();
      return { left: Math.round(r.left), right: Math.round(r.right), width: Math.round(r.width) };
    });
    const buttons = Array.from(header.querySelectorAll('button')).map((b) => {
      const r = b.getBoundingClientRect();
      return { label: (b.textContent || '').trim().slice(0, 24), right: Math.round(r.right), visible: r.width > 0 };
    });
    const rightmost = buttons.reduce((m, b) => Math.max(m, b.right), 0);
    const overlaps = [];
    for (let i = 0; i < groups.length - 1; i++) {
      if (groups[i].right > groups[i + 1].left) overlaps.push(`group ${i} overlaps group ${i + 1}`);
    }
    return {
      viewport: window.innerWidth,
      docScrollWidth: document.documentElement.scrollWidth,
      groups,
      rightmostButtonRight: rightmost,
      fits: rightmost <= w && document.documentElement.scrollWidth <= w && overlaps.length === 0,
      overlaps,
      buttonCount: buttons.length,
    };
  }, width);
  console.log(JSON.stringify(info, null, 2));
  await page.screenshot({ path: `temp_screenshots/superadmin-topbar-fit-${width}.png` });
  await browser.close();
}
main().catch((e) => { console.error(e); process.exit(1); });
