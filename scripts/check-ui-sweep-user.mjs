import { chromium } from 'playwright';
import { existsSync, mkdirSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

/**
 * check-ui-sweep-user.mjs — read/verify UI sweep of user-web (read-only, no fixes).
 * Saves screenshots to temp_screenshots/ui-sweep-user/ and logs console/network errors.
 */
const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const OUT = join(ROOT, 'temp_screenshots', 'ui-sweep-user');
if (!existsSync(OUT)) mkdirSync(OUT, { recursive: true });

const BASE = 'http://localhost:5173';
const VIEWPORT = { width: 1440, height: 900 };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const consoleLog = [];
const badResponses = [];

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: VIEWPORT });

page.on('console', (msg) => {
  if (['error', 'warning'].includes(msg.type())) {
    consoleLog.push({ type: msg.type(), text: msg.text().slice(0, 400) });
  }
});
page.on('pageerror', (err) => consoleLog.push({ type: 'pageerror', text: err.message.slice(0, 400) }));
page.on('response', (res) => {
  if (res.status() >= 400 && !res.url().includes('favicon')) {
    badResponses.push({ status: res.status(), url: res.url().slice(0, 160) });
  }
});
page.on('requestfailed', (req) => {
  badResponses.push({ status: 'FAILED', url: req.url().slice(0, 160), err: req.failure()?.errorText });
});

let shotIdx = 0;
async function shot(name, wait = 0) {
  if (wait) await sleep(wait);
  shotIdx++;
  const file = join(OUT, `${String(shotIdx).padStart(2, '0')}-${name}.png`);
  await page.screenshot({ path: file });
  console.log(`📸 ${shotIdx}-${name}`);
}

async function section(name, fn) {
  console.log(`\n── ${name} ──`);
  try {
    await fn();
  } catch (err) {
    console.log(`⚠ SECTION ERROR: ${err.message.split('\n')[0]}`);
    await shot(`ERROR-${name.replace(/\W+/g, '-')}`).catch(() => {});
  }
}

async function gotoMap(suffix = '') {
  await page.goto(`${BASE}/map${suffix}`, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('.maplibregl-canvas', { timeout: 20000 });
  await page.waitForFunction(() => !!window.__geowatchUserMap, { timeout: 20000 });
  await sleep(3200);
}

async function flyTo(lng, lat, zoom) {
  await page.evaluate(
    ([lng, lat, zoom]) => window.__geowatchUserMap.jumpTo({ center: [lng, lat], zoom }),
    [lng, lat, zoom]
  );
  await sleep(1600);
}

async function clickMapAt(lng, lat) {
  const pt = await page.evaluate(
    ([lng, lat]) => {
      const p = window.__geowatchUserMap.project([lng, lat]);
      return { x: p.x, y: p.y };
    },
    [lng, lat]
  );
  await page.mouse.click(pt.x, pt.y);
}

const camBefore = () =>
  page.evaluate(() => {
    const m = window.__geowatchUserMap;
    const c = m.getCenter();
    return { lng: c.lng, lat: c.lat, zoom: m.getZoom() };
  });

// ═══ 1. Home ═══
await section('home', async () => {
  await page.goto(`${BASE}/`, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('.maplibregl-canvas', { timeout: 20000 }).catch(() => {});
  await sleep(3500);
  await shot('home-hero');
  await page.evaluate(() => window.scrollTo({ top: window.innerHeight * 0.9, behavior: 'instant' }));
  await shot('home-stats-band', 900);
  await page.evaluate(() => window.scrollTo({ top: window.innerHeight * 2.2, behavior: 'instant' }));
  await shot('home-sections', 900);
  await page.evaluate(() => window.scrollTo({ top: document.body.scrollHeight, behavior: 'instant' }));
  await shot('home-footer', 900);
});

// ═══ 2. Map initial load ═══
await section('map-initial', async () => {
  await gotoMap();
  await shot('map-initial');
  // zoom into the Gulf to see markers + zone fills clearly
  await flyTo(53, 26.5, 4.6);
  await shot('map-mideast-view');
});

// ═══ 3. Incident select → sidebar → evidence drawer → lightbox ═══
await section('incident-sidebar', async () => {
  await gotoMap();
  await flyTo(56.3, 26.6, 6.5);
  await clickMapAt(56.3, 26.6);
  await sleep(2200);
  let selected = new URL(page.url()).searchParams.get('incident');
  if (!selected) {
    console.log('  marker click missed — selecting via drawer instead');
    await page.click('button[title="Incidents"]');
    await sleep(1200);
    const card = page.locator('div[style*="cursor: pointer"]', { hasText: 'Tanker' }).first();
    await card.click();
    await sleep(2200);
    selected = new URL(page.url()).searchParams.get('incident');
  }
  console.log('  selected incident:', selected);
  await shot('incident-sidebar-top');
  // scroll sidebar: media mosaic / timeline / sources
  const panel = page.locator('.id-sidebar, aside, [class*="right-panel"]').last();
  await page.evaluate(() => {
    const els = document.querySelectorAll('div');
    for (const el of els) {
      if (el.scrollHeight > el.clientHeight + 200 && el.getBoundingClientRect().left > window.innerWidth * 0.5) {
        el.scrollTop = el.scrollHeight * 0.35;
        return true;
      }
    }
  });
  await shot('incident-sidebar-mid', 700);
  await page.evaluate(() => {
    const els = document.querySelectorAll('div');
    for (const el of els) {
      if (el.scrollHeight > el.clientHeight + 200 && el.getBoundingClientRect().left > window.innerWidth * 0.5) {
        el.scrollTop = el.scrollHeight * 0.7;
        return true;
      }
    }
  });
  await shot('incident-sidebar-low', 700);

  // click a timeline update → evidence drawer
  const upd = page.locator('text=Crew of 23 confirmed safe').first();
  if (await upd.count()) {
    await upd.scrollIntoViewIfNeeded().catch(() => {});
    await upd.click();
    await sleep(1600);
    await shot('incident-evidence-drawer-media');
    // tabs
    for (const tab of ['Posts', 'Articles', 'Notes']) {
      const t = page.locator(`button:has-text("${tab}"), [role="tab"]:has-text("${tab}")`).first();
      if (await t.count()) {
        await t.click();
        await sleep(700);
        await shot(`incident-evidence-tab-${tab.toLowerCase()}`);
      }
    }
    // back to media tab, open lightbox
    const mediaTab = page.locator('button:has-text("Media"), [role="tab"]:has-text("Media")').first();
    if (await mediaTab.count()) await mediaTab.click();
    await sleep(700);
    const img = page.locator('.id-ev-grid img, [class*="evidence"] img, .id-lightbox-trigger img').first();
    const anyImg = (await img.count()) ? img : page.locator('aside img, .id-sidebar img').first();
    if (await anyImg.count()) {
      await anyImg.click();
      await sleep(1200);
      await shot('incident-lightbox');
      await page.keyboard.press('Escape');
      await sleep(800);
      await shot('incident-lightbox-closed');
    } else {
      console.log('  ⚠ no image found for lightbox');
    }
  } else {
    console.log('  ⚠ timeline update text not found');
  }
});

// ═══ 4. Zone select → zone sidebar ═══
await section('zone-sidebar', async () => {
  await gotoMap();
  await flyTo(56.5, 26.5, 6);
  await clickMapAt(56.5, 26.5);
  await sleep(2200);
  let zoneId = new URL(page.url()).searchParams.get('zone');
  if (!zoneId) {
    console.log('  zone click missed — falling back to deep link');
    await gotoMap('?zone=6877644c-4557-4625-81fb-2809fd019a44');
    zoneId = new URL(page.url()).searchParams.get('zone');
  }
  console.log('  selected zone:', zoneId);
  await shot('zone-sidebar-top');
  await page.evaluate(() => {
    const els = document.querySelectorAll('div');
    for (const el of els) {
      if (el.scrollHeight > el.clientHeight + 200 && el.getBoundingClientRect().left > window.innerWidth * 0.5) {
        el.scrollTop = el.scrollHeight * 0.5;
        return true;
      }
    }
  });
  await shot('zone-sidebar-mid', 700);
  const upd = page.locator('text=Coalition issues escort advisory').first();
  if (await upd.count()) {
    await upd.scrollIntoViewIfNeeded().catch(() => {});
    await upd.click();
    await sleep(1500);
    await shot('zone-evidence-drawer');
    const img = page.locator('.id-ev-grid img, [class*="evidence"] img').first();
    if (await img.count()) {
      await img.click();
      await sleep(1100);
      await shot('zone-lightbox');
      await page.keyboard.press('Escape');
      await sleep(700);
    }
  } else {
    console.log('  ⚠ zone update text not found');
  }
});

// ═══ 5. Directories ═══
await section('directories', async () => {
  await page.goto(`${BASE}/incidents`, { waitUntil: 'domcontentloaded' });
  await sleep(2200);
  await shot('dir-incidents');
  // open CategoryMultiSelect (domains-first accordion)
  const trigger = page.locator('button:has-text("Categories")').first();
  if (await trigger.count()) {
    await trigger.click();
    await sleep(800);
    await shot('dir-incidents-cms-accordion');
    // drill into Conflict domain: click its row chevron/name
    const conflictRow = page.locator('.cms-panel >> text=Conflict').first();
    if (await conflictRow.count()) {
      await conflictRow.click();
      await sleep(600);
      await shot('dir-incidents-cms-domain-drill');
      const airStrike = page.locator('.cms-panel >> text=Air Strike').first();
      if (await airStrike.count()) await airStrike.click();
    }
    // pick a second category from another domain via search
    const search = page.locator('.cms-panel input').first();
    if (await search.count()) {
      await search.fill('labor');
      await sleep(500);
      const labor = page.locator('.cms-panel >> text=Labor Strike').first();
      if (await labor.count()) await labor.click();
      await search.fill('');
    }
    await page.keyboard.press('Escape');
    await sleep(1200);
    await shot('dir-incidents-chips-filtered');
  }
  await page.goto(`${BASE}/zones`, { waitUntil: 'domcontentloaded' });
  await sleep(2200);
  await shot('dir-zones');
  const zTrigger = page.locator('button:has-text("Categories"), button:has-text("Zone categories")').first();
  if (await zTrigger.count()) {
    await zTrigger.click();
    await sleep(700);
    await shot('dir-zones-cms-flat');
    await page.keyboard.press('Escape');
  }
});

// ═══ 6. Detail pages + Back camera restore ═══
await section('detail-pages-back-restore', async () => {
  await gotoMap();
  await flyTo(56.3, 26.6, 7);
  const cam = await camBefore();
  console.log('  camera before detail:', JSON.stringify(cam));
  await clickMapAt(56.3, 26.6);
  await sleep(2200);
  let selected = new URL(page.url()).searchParams.get('incident');
  if (!selected) {
    await page.click('button[title="Incidents"]');
    await sleep(1200);
    await page.locator('div[style*="cursor: pointer"]', { hasText: 'Tanker' }).first().click();
    await sleep(2200);
    selected = new URL(page.url()).searchParams.get('incident');
  }
  const fullBtn = page.locator('button.id-btn-primary', { hasText: 'Full details' }).first();
  if (await fullBtn.count()) {
    await fullBtn.click();
    await sleep(2500);
    await shot('incident-detail-page-top');
    await page.evaluate(() => window.scrollTo({ top: window.innerHeight * 0.95, behavior: 'instant' }));
    await shot('incident-detail-page-mid', 900);
    await page.evaluate(() => window.scrollTo({ top: document.body.scrollHeight, behavior: 'instant' }));
    await shot('incident-detail-page-bottom', 900);
    // Back → instant camera restore
    await page.locator('button.opt1-back-link').first().click();
    await page.waitForSelector('.maplibregl-canvas', { timeout: 15000 });
    await shot('back-map-restored-incident', 1200); // immediate: no re-flight should be visible
    await sleep(2000);
    const camAfter = await camBefore();
    console.log('  camera after back:', JSON.stringify(camAfter));
    const drift = Math.abs(camAfter.zoom - cam.zoom);
    console.log(`  zoom drift: ${drift.toFixed(3)} (expect ~0)`);
    await shot('back-map-restored-incident-settled');
  } else {
    console.log('  ⚠ Full details button not found');
  }

  // zone detail page
  await gotoMap('?zone=6877644c-4557-4625-81fb-2809fd019a44');
  await shot('zone-selected-map');
  const zFull = page.locator('button.id-btn-primary', { hasText: 'Full details' }).first();
  if (await zFull.count()) {
    await zFull.click();
    await sleep(2500);
    await shot('zone-detail-page-top');
    await page.evaluate(() => window.scrollTo({ top: document.body.scrollHeight, behavior: 'instant' }));
    await shot('zone-detail-page-bottom', 900);
    await page.locator('button.opt1-back-link').first().click();
    await page.waitForSelector('.maplibregl-canvas', { timeout: 15000 });
    await shot('back-map-restored-zone', 1500);
  }
});

// ═══ 7. ⌘K palette ═══
await section('command-palette', async () => {
  await gotoMap();
  await page.keyboard.press('Control+k');
  await sleep(900);
  await shot('palette-open-idle');
  await page.keyboard.type('hormu', { delay: 40 });
  await sleep(1400);
  await shot('palette-hormu');
  // zones scope tab
  await page.locator('button:has-text("Zones")').first().click();
  await sleep(700);
  await shot('palette-hormu-zones-scope');
  // keyboard nav
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('ArrowDown');
  await sleep(400);
  await shot('palette-keyboard-nav');
  // back to All, query karachi → locations via proxy
  await page.locator('button:has-text("All")').first().click();
  await page.locator('input').first().fill('');
  await page.keyboard.type('karachi', { delay: 40 });
  await sleep(1600);
  await shot('palette-karachi-locations');
  // rafah
  await page.locator('input').first().fill('');
  await page.keyboard.type('rafah', { delay: 40 });
  await sleep(1400);
  await shot('palette-rafah');
  // bridge row → Power Search seeded
  const bridge = page.locator('button:has-text("Search all incidents")').first();
  if (await bridge.count()) {
    await bridge.click();
    await sleep(1800);
    await shot('palette-bridge-powersearch');
    await page.keyboard.press('Escape');
    await sleep(600);
  } else {
    console.log('  ⚠ bridge row not found');
  }
});

// ═══ 8. Date controls + gating ═══
await section('date-controls', async () => {
  await gotoMap();
  await shot('date-live-default');
  await page.locator('.tbd-trigger').click();
  await page.waitForSelector('.tbd-panel', { timeout: 5000 });
  await shot('date-panel-open', 400);
  const preset60 = page.locator('.tbd-panel .tui-date-preset:has-text("60")').first();
  if (await preset60.count()) {
    await preset60.click();
  } else {
    await page.locator('.tbd-panel .tui-date-preset:has-text("Last 30 days")').first().click();
  }
  await sleep(2500);
  await shot('date-historic-60d');
  // zoom out below gate to surface the gating hint
  await flyTo(45, 27, 3.2);
  await shot('date-large-range-gating-hint');
  // Damascus should be loadable now — pan there
  await flyTo(36.5, 33.4, 7);
  await sleep(1800);
  await shot('date-damascus-visible');
  const found = await page.evaluate(() => {
    const m = window.__geowatchUserMap;
    const feats = m.queryRenderedFeatures({ layers: [] }) || [];
    return document.body.innerText.includes('Damascus');
  });
  console.log('  damascus text present on page:', found);
});

// ═══ 9. About + 404 ═══
await section('about-404', async () => {
  await page.goto(`${BASE}/about`, { waitUntil: 'domcontentloaded' });
  await sleep(2200);
  await shot('about-top');
  await page.evaluate(() => window.scrollTo({ top: document.body.scrollHeight, behavior: 'instant' }));
  await shot('about-bottom', 800);
  await page.goto(`${BASE}/no-such-page-xyz`, { waitUntil: 'domcontentloaded' });
  await sleep(1500);
  await shot('404-page');
});

// ═══ 10. Light theme spot-check ═══
await section('light-theme', async () => {
  await page.goto(`${BASE}/map`, { waitUntil: 'domcontentloaded' });
  await page.evaluate(() => localStorage.setItem('geowatch-theme', 'light'));
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.waitForSelector('.maplibregl-canvas', { timeout: 20000 });
  await page.waitForFunction(() => !!window.__geowatchUserMap, { timeout: 20000 });
  await sleep(3500);
  await shot('light-map');
  await gotoMap('?incident=c76049ad-1462-41f5-8a5a-97a760776247');
  await shot('light-incident-sidebar');
  await page.goto(`${BASE}/incident/c76049ad-1462-41f5-8a5a-97a760776247`, { waitUntil: 'domcontentloaded' });
  await sleep(2500);
  await shot('light-incident-detail');
  await page.evaluate(() => localStorage.setItem('geowatch-theme', 'dark'));
});

console.log('\n═══ CONSOLE ERRORS/WARNINGS ═══');
const seen = new Set();
for (const c of consoleLog) {
  const key = c.text.slice(0, 120);
  if (seen.has(key)) continue;
  seen.add(key);
  console.log(`[${c.type}] ${c.text}`);
}
console.log('\n═══ FAILED / 4xx-5xx REQUESTS ═══');
const seenR = new Set();
for (const r of badResponses) {
  const key = `${r.status} ${r.url}`;
  if (seenR.has(key)) continue;
  seenR.add(key);
  console.log(`${r.status} ${r.url}${r.err ? ` (${r.err})` : ''}`);
}

await browser.close();
console.log('\nSweep complete.');
