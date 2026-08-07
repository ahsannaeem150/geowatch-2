// BUG C verify: theme toggle must not kill zone hover/click.
// Click liveness is proven by clicking DIFFERENT zones across steps and
// watching the zone= URL param switch ids (defeats sticky-param false negatives).
import { chromium } from 'playwright';

const BASE = 'http://localhost:5174';
const STATE = 'temp_screenshots/ui-sweep-admin/auth-state.json';
const SHOTS = 'temp_screenshots/fix-verify-admin';

const pageErrors = [];

async function shot(page, name) {
  try { await page.screenshot({ timeout: 8000, animations: 'disabled', path: `${SHOTS}/theme-${name.replace(/\W+/g, '-').toLowerCase()}.png` }); }
  catch (e) { console.log('(screenshot skipped:', e.message.split('\n')[0] + ')'); }
}

// Return up to `want` distinct zones with an unoccluded hit pixel each.
async function pickZonePixels(page, want = 3) {
  return page.evaluate((want) => {
    const m = window.__geowatchAdminMap;
    const canvas = document.querySelector('.maplibregl-canvas');
    const rect = canvas.getBoundingClientRect();
    const feats = m.getSource('zones')?._data?.features || [];
    const out = [];
    const seen = new Set();
    for (const f of feats) {
      const id = String(f.properties?.id || f.id);
      if (seen.has(id)) continue;
      const ring = f.geometry?.coordinates?.[0];
      if (!ring?.length) continue;
      let sx = 0, sy = 0;
      const n = Math.min(ring.length, 64);
      for (let i = 0; i < n; i++) { sx += ring[i][0]; sy += ring[i][1]; }
      const c = [sx / n, sy / n];
      const cands = [c];
      for (const i of [0, Math.floor(n / 3), Math.floor((2 * n) / 3)]) {
        cands.push([(c[0] + ring[i][0]) / 2, (c[1] + ring[i][1]) / 2]);
      }
      for (const ll of cands) {
        const p = m.project(ll);
        const wx = rect.left + p.x, wy = rect.top + p.y;
        if (p.x < 40 || p.y < 60 || p.x > rect.width - 40 || p.y > rect.height - 60) continue;
        let hits = 0;
        try { hits = m.queryRenderedFeatures(p, { layers: ['zone-hit'] }).length; } catch { continue; }
        if (hits < 1) continue;
        if (document.elementFromPoint(wx, wy) !== canvas) continue;
        out.push({ id, name: f.properties?.name, x: wx, y: wy });
        seen.add(id);
        break;
      }
      if (out.length >= want) break;
    }
    return out;
  }, want);
}

async function diag(page, label) {
  const d = await page.evaluate(() => {
    const m = window.__geowatchAdminMap;
    return {
      layer: !!m.getLayer('zone-hit'),
      src: !!m.getSource('zones'),
      srcFeatures: (m.getSource('zones')?._data?.features || []).length,
      theme: document.documentElement.getAttribute('data-theme'),
    };
  });
  console.log(`[diag] ${label}: ${JSON.stringify(d)}`);
  return d;
}

// Probe hover on pixels[0] and click pixels[clickIdx]; assert zone param switches to that id.
async function probe(page, label, pixels, clickIdx = 0) {
  await diag(page, label);
  if (!pixels.length) {
    console.log(`### ${label}: NO unoccluded zone pixels *** DEAD ***`);
    await shot(page, label);
    return { dead: true };
  }
  const hov = pixels[0];
  await page.mouse.move(200, 300, { steps: 2 });
  await page.waitForTimeout(250);
  await page.mouse.move(hov.x, hov.y, { steps: 5 });
  await page.waitForTimeout(450);
  const cursor = await page.evaluate(() => window.__geowatchAdminMap.getCanvas().style.cursor);

  const target = pixels[clickIdx] || pixels[0];
  await page.mouse.click(target.x, target.y);
  await page.waitForTimeout(1200);
  const url = page.url();
  const clicked = url.includes(`zone=${target.id}`);
  const dead = cursor !== 'pointer' || !clicked;
  console.log(`### ${label}: hover "${hov.name}" → cursor="${cursor}"; click "${target.name}" → ${clicked ? 'zone param OK' : `NO PARAM (${url.slice(-60)})`} ${dead ? '*** DEAD ***' : 'OK'}`);
  await shot(page, label);
  return { dead, cursor, clicked };
}

const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({ storageState: STATE, viewport: { width: 1440, height: 900 } });
const page = await ctx.newPage();
page.on('pageerror', (err) => pageErrors.push(String(err).slice(0, 250)));
page.on('console', (msg) => { if (msg.type() === 'error') pageErrors.push('console: ' + msg.text().slice(0, 200)); });

await page.goto(BASE + '/', { waitUntil: 'domcontentloaded' });
await page.waitForSelector('.maplibregl-canvas', { timeout: 25000 });
await page.waitForFunction(() => !!window.__geowatchAdminMap, { timeout: 25000 });
await page.waitForTimeout(5000);

// Fly out so multiple zones are visible at once
await page.evaluate(() => window.__geowatchAdminMap.jumpTo({ center: [45, 30], zoom: 4.5 }));
await page.waitForTimeout(800);

let pixels = await pickZonePixels(page, 3);
console.log('zone pixels:', pixels.map((p) => `${p.name}@${Math.round(p.x)},${Math.round(p.y)}`));
await probe(page, 'baseline', pixels, 0);

// ─── Open Settings drawer, toggle dark → light ───
const toggleSel = 'button[title="Switch to light mode"], button[title="Switch to dark mode"]';
async function toggleTheme() {
  if ((await page.locator(toggleSel).count()) === 0) {
    await page.click('button[title="Settings"]');
    await page.waitForTimeout(900);
  }
  await page.locator(toggleSel).first().click();
  await page.waitForTimeout(2500);
}

await toggleTheme();
pixels = await pickZonePixels(page, 3);
await probe(page, 'after-theme-light', pixels, 1 % Math.max(pixels.length, 1));

// ─── Toggle light → dark ───
await toggleTheme();
pixels = await pickZonePixels(page, 3);
await probe(page, 'after-theme-dark', pixels, 0);

// ─── Decisive click test: param currently holds zone A; fly to a different
// region and click zone B — the param must SWITCH ids ───
const idBefore = await page.evaluate(() => new URLSearchParams(location.search).get('zone'));
await page.evaluate(() => window.__geowatchAdminMap.jumpTo({ center: [68.5, 33.0], zoom: 6.5 }));
await page.waitForTimeout(900);
const pixelsB = (await pickZonePixels(page, 3)).filter((p) => p.id !== idBefore);
if (!pixelsB.length) {
  console.log('### param-switch: no different zone pixel found (inconclusive)');
} else {
  await page.mouse.click(pixelsB[0].x, pixelsB[0].y);
  await page.waitForTimeout(1200);
  const idAfter = await page.evaluate(() => new URLSearchParams(location.search).get('zone'));
  const ok = idAfter === pixelsB[0].id && idAfter !== idBefore;
  console.log(`### param-switch: clicked "${pixelsB[0].name}" → zone ${idBefore} → ${idAfter} ${ok ? 'OK' : '*** DEAD ***'}`);
}

console.log('\n=== page/console errors ===');
console.log(pageErrors.slice(0, 20));
await browser.close();
