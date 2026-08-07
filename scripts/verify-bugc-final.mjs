// BUG C final verification: theme toggles must not kill zone hover/click.
// Panel stays CLOSED until the final click to avoid the unrelated stale-searchParams
// clobber race (pre-existing, reported separately). Asserts:
//   baseline hover pointer | post-light hover pointer + click sets zone param | post-dark hover pointer
import { chromium } from 'playwright';
const BASE = 'http://localhost:5174';
const STATE = 'temp_screenshots/ui-sweep-admin/auth-state.json';
const SHOTS = 'temp_screenshots/fix-verify-admin';
const pageErrors = [];

async function pickPixel(page) {
  return page.evaluate(() => {
    const m = window.__geowatchAdminMap;
    const canvas = document.querySelector('.maplibregl-canvas');
    const rect = canvas.getBoundingClientRect();
    for (const f of m.getSource('zones')?._data?.features || []) {
      const ring = f.geometry?.coordinates?.[0];
      if (!ring?.length) continue;
      let sx = 0, sy = 0; const n = Math.min(ring.length, 64);
      for (let i = 0; i < n; i++) { sx += ring[i][0]; sy += ring[i][1]; }
      const c = [sx / n, sy / n];
      const cands = [c];
      for (const i of [0, Math.floor(n / 3), Math.floor((2 * n) / 3)]) cands.push([(c[0] + ring[i][0]) / 2, (c[1] + ring[i][1]) / 2]);
      for (const ll of cands) {
        const p = m.project(ll);
        const wx = rect.left + p.x, wy = rect.top + p.y;
        if (p.x < 40 || p.y < 60 || p.x > rect.width - 40 || p.y > rect.height - 60) continue;
        let hits = 0;
        try { hits = m.queryRenderedFeatures(p, { layers: ['zone-hit'] }).length; } catch { continue; }
        if (hits < 1 || document.elementFromPoint(wx, wy) !== canvas) continue;
        return { id: String(f.properties.id), name: f.properties.name, x: wx, y: wy };
      }
    }
    return null;
  });
}

async function hoverProbe(page, label) {
  const d = await page.evaluate(() => {
    const m = window.__geowatchAdminMap;
    return { layer: !!m.getLayer('zone-hit'), src: !!m.getSource('zones'), n: (m.getSource('zones')?._data?.features || []).length };
  });
  const t = await pickPixel(page);
  if (!t) { console.log(`### ${label}: NO zone pixel ${JSON.stringify(d)} *** DEAD ***`); return { ok: false }; }
  await page.mouse.move(200, 300, { steps: 2 });
  await page.waitForTimeout(250);
  await page.mouse.move(t.x, t.y, { steps: 5 });
  await page.waitForTimeout(450);
  const cursor = await page.evaluate(() => window.__geowatchAdminMap.getCanvas().style.cursor);
  const ok = d.layer && d.n > 0 && cursor === 'pointer';
  console.log(`### ${label}: ${JSON.stringify(d)} hover "${t.name}" → cursor="${cursor}" ${ok ? 'OK' : '*** DEAD ***'}`);
  try { await page.screenshot({ timeout: 8000, animations: 'disabled', path: `${SHOTS}/bugc-${label.replace(/\W+/g, '-').toLowerCase()}.png` }); } catch {}
  return { ok, pixel: t };
}

const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({ storageState: STATE, viewport: { width: 1440, height: 900 } });
const page = await ctx.newPage();
page.on('pageerror', (e) => pageErrors.push(String(e).slice(0, 200)));
await page.goto(BASE + '/', { waitUntil: 'domcontentloaded' });
await page.waitForSelector('.maplibregl-canvas', { timeout: 25000 });
await page.waitForFunction(() => !!window.__geowatchAdminMap, { timeout: 25000 });
await page.waitForTimeout(5000);
await page.evaluate(() => window.__geowatchAdminMap.jumpTo({ center: [50, 28], zoom: 5.5 }));
await page.waitForTimeout(800);

const r0 = await hoverProbe(page, 'baseline-hover');

await page.click('button[title="Settings"]');
await page.waitForTimeout(900);
const tgl = 'button[title="Switch to light mode"], button[title="Switch to dark mode"]';
await page.locator(tgl).first().click();
await page.waitForTimeout(2500);
const r1 = await hoverProbe(page, 'after-light-hover');

// Click end-to-end with the panel still closed
let clickOk = false;
if (r1.pixel) {
  await page.mouse.click(r1.pixel.x, r1.pixel.y);
  await page.waitForTimeout(1500);
  const param = await page.evaluate(() => new URLSearchParams(location.search).get('zone'));
  clickOk = param === r1.pixel.id;
  console.log(`### after-light-click: zone param = ${param} ${clickOk ? 'OK' : '*** FAIL ***'}`);
  try { await page.screenshot({ timeout: 8000, animations: 'disabled', path: `${SHOTS}/bugc-after-light-click.png` }); } catch {}
}

await page.locator(tgl).first().click();
await page.waitForTimeout(2500);
const r2 = await hoverProbe(page, 'after-dark-hover');

console.log('\nerrors:', pageErrors.slice(0, 10));
console.log(r0.ok && r1.ok && clickOk && r2.ok ? '\nBUG C: ALL PASS' : '\nBUG C: FAILURES PRESENT');
await browser.close();
