import { chromium } from 'playwright';
const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({
  storageState: 'temp_screenshots/ui-sweep-superadmin/auth-state.json',
  viewport: { width: 1600, height: 950 },
});
const page = await context.newPage();
await page.goto('http://localhost:5175/superadmin/map', { waitUntil: 'domcontentloaded' });
await page.waitForFunction(() => window.__intelmap24SuperadminMap?.isStyleLoaded(), { timeout: 20000 });
await page.waitForFunction(() => document.querySelectorAll('.maplibregl-marker').length > 0, { timeout: 15000 });
const result = await page.evaluate(async () => {
  const marker = [...document.querySelectorAll('.maplibregl-marker')].find((m) => m.firstElementChild);
  if (!marker) return { ok: false, why: 'no marker' };
  marker.firstElementChild.dispatchEvent(new MouseEvent('mouseenter', { bubbles: true }));
  await new Promise((r) => setTimeout(r, 600));
  const popup = document.querySelector('.maplibregl-popup');
  if (!popup) return { ok: false, why: 'no popup' };
  const badges = [...popup.querySelectorAll('span')].map((s) => {
    const cs = getComputedStyle(s);
    return { text: s.textContent.trim().slice(0, 20), color: cs.color, bg: cs.backgroundColor };
  }).filter((b) => b.text);
  return { ok: true, badges };
});
console.log(JSON.stringify(result, null, 1));
await browser.close();
