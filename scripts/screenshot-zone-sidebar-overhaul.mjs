// Zone sidebar overhaul screenshots — user-web + admin-web, dark + light.
import { chromium } from 'playwright';
import { mkdirSync } from 'fs';

const OUT = 'temp_screenshots/zone-sidebar-overhaul';
mkdirSync(OUT, { recursive: true });

const ZONE_ID = 'b8aa6cdb-50c1-4b4c-9bc6-ccb145a70862';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function openZoneSidebar(page, mapGlobal) {
  await page.waitForFunction((g) => !!window[g], mapGlobal, { timeout: 25000 });
  // Direct URL selection — a plain map click can land on a co-located point
  // marker (markers win over the zone-hit layer) and open the incident sidebar.
  await page.goto(`${page.url().split('?')[0]}?zone=${ZONE_ID}`, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction((g) => !!window[g], mapGlobal, { timeout: 25000 });
  await sleep(3500);
  // Frame the zone for context, then let the selection camera settle.
  const pt = await page.evaluate(
    ([g, zid]) => {
      const m = window[g];
      const f = (m.getSource('zones')?._data?.features || []).find((x) => String(x.id) === zid);
      if (!f) return null;
      const ring = f.geometry.coordinates[0];
      let sx = 0,
        sy = 0;
      for (const [x, y] of ring) {
        sx += x;
        sy += y;
      }
      return [sx / ring.length, sy / ring.length];
    },
    [mapGlobal, ZONE_ID]
  );
  if (pt) {
    await page.evaluate(([g, c]) => window[g].jumpTo({ zoom: 9, center: c }), [mapGlobal, pt]);
  }
  await page.waitForSelector('.zone-detail-sidebar .zone-summary', { timeout: 10000 });
  await sleep(1500); // let fadeInUp finish
}

async function shotUserWeb(browser, theme) {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await page.addInitScript((t) => localStorage.setItem('intelmap24-theme', t), theme);
  await page.goto('http://localhost:5173/map', { waitUntil: 'domcontentloaded' });
  await openZoneSidebar(page, '__intelmap24UserMap');
  await page.screenshot({ path: `${OUT}/zone-sidebar-${theme}-user.png` });
  await page.close();
  console.log(`saved zone-sidebar-${theme}-user.png`);
}

async function shotAdminWeb(browser, theme, token) {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await page.addInitScript(
    ([t, tok]) => {
      localStorage.setItem('intelmap24-theme', t);
      localStorage.setItem('intelmap24_token', tok);
    },
    [theme, token]
  );
  await page.goto('http://localhost:5174/', { waitUntil: 'domcontentloaded' });
  await openZoneSidebar(page, '__intelmap24AdminMap');
  await page.screenshot({ path: `${OUT}/zone-sidebar-${theme}-admin.png` });
  await page.close();
  console.log(`saved zone-sidebar-${theme}-admin.png`);
}

const browser = await chromium.launch();
try {
  await shotUserWeb(browser, 'dark');
  await shotUserWeb(browser, 'light');

  // Admin (optional — needs staff login for the workspace map).
  const login = await fetch('http://localhost:3100/api/v1/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'admin@geowatch.local', password: 'AdminPass123!' }),
  }).then((r) => r.json());
  const token = login?.data?.token;
  if (token) {
    await shotAdminWeb(browser, 'dark', token);
    await shotAdminWeb(browser, 'light', token);
  } else {
    console.log('admin login failed — skipped admin shots:', login?.message || 'no token');
  }
} finally {
  await browser.close();
}
