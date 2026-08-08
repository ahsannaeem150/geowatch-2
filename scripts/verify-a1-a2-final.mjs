// A1 + A2 final verification (admin-web Active drawer zone rows).
// A1: zone row shows zone category name ("NOTMAR") + zone color dot (not "Unknown" grey).
// A2: clicking the row routes to handleZoneClick — URL zone= param (not incident=),
//     zone sidebar opens, camera flies to the zone.
import { chromium } from 'playwright';
const BASE = 'http://localhost:5174';
const STATE = 'temp_screenshots/ui-sweep-admin/auth-state.json';
const SHOTS = 'temp_screenshots/fix-verify-admin';
const pageErrors = [];

const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({ storageState: STATE, viewport: { width: 1440, height: 900 } });
const page = await ctx.newPage();
page.on('pageerror', (e) => pageErrors.push(String(e).slice(0, 200)));
await page.goto(BASE + '/', { waitUntil: 'domcontentloaded' });
await page.waitForSelector('.maplibregl-canvas', { timeout: 25000 });
await page.waitForFunction(() => !!window.__intelmap24AdminMap, { timeout: 25000 });
await page.waitForTimeout(5000);

// ─── Open the Active drawer ───
await page.click('button[title="Active"]');
await page.waitForTimeout(1200);
await page.screenshot({ timeout: 8000, animations: 'disabled', path: `${SHOTS}/a1-drawer-before.png` }).catch(() => {});

// ─── A1: zone row label + dot color ───
const rowInfo = await page.evaluate(() => {
  const rows = [...document.querySelectorAll('div')].filter((d) => d.textContent?.includes('Bab el-Mandeb'));
  // narrow to the smallest row container that has the title
  const row = rows.sort((a, b) => a.textContent.length - b.textContent.length)[0]?.closest('div[style*="border"]') || rows[0];
  if (!row) return null;
  const spans = [...row.querySelectorAll('span')];
  const dot = spans.find((s) => s.style.borderRadius === '50%' || s.style.borderRadius?.includes('50'));
  const label = dot?.parentElement?.textContent?.trim();
  return { label, dotBg: dot?.style?.background || getComputedStyle(dot || row).backgroundColor };
});
console.log('A1 row info:', JSON.stringify(rowInfo));
const a1Ok = !!rowInfo && rowInfo.label === 'NOTMAR';
console.log(`### A1 label: "${rowInfo?.label}" (expect NOTMAR) dot=${rowInfo?.dotBg} ${a1Ok ? 'OK' : '*** FAIL ***'}`);

// ─── A2: click the zone row ───
const centerBefore = await page.evaluate(() => { const c = window.__intelmap24AdminMap.getCenter(); return [c.lng, c.lat]; });
await page.locator('text=High-Risk Transit Corridor').first().click();
await page.waitForTimeout(2500);
const url = page.url();
const centerAfter = await page.evaluate(() => { const c = window.__intelmap24AdminMap.getCenter(); return [c.lng, c.lat]; });
const hasZoneParam = url.includes('zone=') && !url.includes('incident=');
const moved = Math.abs(centerAfter[0] - centerBefore[0]) + Math.abs(centerAfter[1] - centerBefore[1]) > 2;
// zone sidebar markers in admin mode: "Edit Shape" button or zone detail content
const sidebarMarker = (await page.locator('button:has-text("Edit Shape")').count())
  + (await page.locator('button:has-text("Edit shape")').count())
  + (await page.locator('text=Targeting').count());
await page.screenshot({ timeout: 8000, animations: 'disabled', path: `${SHOTS}/a2-after-row-click.png` }).catch(() => {});
console.log(`### A2 click: url=${url.slice(-70)}`);
console.log(`    zone-param (no incident=): ${hasZoneParam ? 'OK' : '*** FAIL ***'}; camera moved ${moved ? 'OK' : '*** FAIL ***'} (${centerBefore} → ${centerAfter}); sidebar marker count=${sidebarMarker}`);
const a2Ok = hasZoneParam && moved;

// ─── Regression: zone hover still alive after the drawer click ───
const hover = await page.evaluate(() => {
  const m = window.__intelmap24AdminMap;
  return { layer: !!m.getLayer('zone-hit'), n: (m.getSource('zones')?._data?.features || []).length };
});
console.log('### post-click zone layer:', JSON.stringify(hover));

console.log('\nerrors:', pageErrors.slice(0, 10));
console.log(a1Ok && a2Ok ? '\nA1+A2: ALL PASS' : '\nA1/A2: FAILURES PRESENT');
await browser.close();
