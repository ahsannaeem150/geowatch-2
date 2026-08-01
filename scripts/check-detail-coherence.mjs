import { chromium } from 'playwright';
import { mkdirSync } from 'fs';

/**
 * check-detail-coherence.mjs — step-3 coherence pass verification (public,
 * no login): hero title has no gradient text, pills/chips have no frosted
 * blur, ken-burns is gone, no console errors, light theme readable, and the
 * 630px sidebar has no horizontal overflow. Saves dark+light, page+sidebar
 * screenshots to temp_screenshots/detail-coherence/.
 */

const BASE = 'http://localhost:5173';
const INCIDENT_ID = '477fc53b-3530-4cf9-806c-85eac8e02290';
const SHOTS = 'temp_screenshots/detail-coherence';

let passed = 0;
let failed = 0;
function check(name, cond, detail = '') {
  if (cond) {
    passed++;
    console.log(`PASS  ${name}${detail ? ` — ${detail}` : ''}`);
  } else {
    failed++;
    console.log(`FAIL  ${name}${detail ? ` — ${detail}` : ''}`);
  }
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function luminance([r, g, b]) {
  const f = (c) => {
    c /= 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
}
function parseRgb(str) {
  const m = str.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
  return m ? [Number(m[1]), Number(m[2]), Number(m[3])] : null;
}

async function main() {
  mkdirSync(SHOTS, { recursive: true });
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1600, height: 950 } });

  const consoleErrors = [];
  const pageErrors = [];
  page.on('console', (msg) => {
    if (msg.type() !== 'error') return;
    const text = msg.text();
    // Network resource failures (401/403) are pre-existing auth artifacts on
    // public pages (logged-out authed probes, Google Sign-In localhost 403 —
    // see AGENTS.md known issues), not coherence regressions.
    if (text.startsWith('Failed to load resource')) {
      consoleErrors.push(`[network] ${text.slice(0, 140)}`);
      return;
    }
    // Google Sign-In origin logger — documented known non-blocking issue on
    // localhost (AGENTS.md): not a coherence regression.
    if (text.includes('[GSI_LOGGER]')) {
      consoleErrors.push(`[gsi] ${text.slice(0, 140)}`);
      return;
    }
    pageErrors.push(text.slice(0, 140));
  });
  page.on('pageerror', (err) => pageErrors.push(String(err).slice(0, 140)));

  // ─── Full page, dark ───
  await page.goto(`${BASE}/incident/${INCIDENT_ID}`, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('.opt1-hero-title', { timeout: 20000 });
  await sleep(1800);

  const heroTitle = await page.locator('.opt1-hero-title').evaluate((el) => {
    const cs = getComputedStyle(el);
    return {
      backgroundImage: cs.backgroundImage,
      webkitTextFillColor: cs.webkitTextFillColor || cs.getPropertyValue('-webkit-text-fill-color'),
      color: cs.color,
    };
  });
  check(
    'hero title: no gradient text',
    !heroTitle.backgroundImage.includes('gradient') && heroTitle.webkitTextFillColor !== 'transparent',
    `bg=${heroTitle.backgroundImage.slice(0, 40)} fill=${heroTitle.webkitTextFillColor}`
  );

  const chipSelectors = ['.opt1-hero-meta-item', '.opt1-filter-tab', '.id-badge', '.opt1-crumbs', '.id-pill'];
  for (const sel of chipSelectors) {
    const count = await page.locator(sel).count();
    if (count === 0) continue;
    const bf = await page.locator(sel).first().evaluate((el) => getComputedStyle(el).backdropFilter);
    check(`no frosted blur on ${sel}`, bf === 'none' || bf === '', `backdrop-filter=${bf}`);
  }

  const kenBurns = await page.locator('.opt1-hero-bg').evaluate((el) => {
    const cs = getComputedStyle(el);
    return { duration: cs.transitionDuration, prop: cs.transitionProperty };
  });
  const dur = parseFloat(kenBurns.duration) || 0;
  check('ken-burns gone (hover zoom ≤ 0.4s)', dur <= 0.4 && dur > 0, `duration=${kenBurns.duration} prop=${kenBurns.prop}`);

  check('no JS errors on page load', pageErrors.length === 0, pageErrors.slice(0, 2).join(' | '));
  if (consoleErrors.length > 0) {
    console.log(`NOTE  pre-existing network artifacts (ignored): ${consoleErrors.length}`);
  }

  await page.screenshot({ path: `${SHOTS}/page-dark.png`, fullPage: false });

  // ─── Full page, light theme ───
  await page.evaluate(() => document.documentElement.setAttribute('data-theme', 'light'));
  await sleep(600);
  const contrastChecks = await page.evaluate(() => {
    const pick = (sel) => {
      const el = document.querySelector(sel);
      if (!el) return null;
      const cs = getComputedStyle(el);
      return { sel, color: cs.color, bg: cs.backgroundColor, fontSize: cs.fontSize };
    };
    return [pick('.opt1-rail-title'), pick('.opt1-event-desc'), pick('.id-summary__desc')].filter(Boolean);
  });
  const bgLight = await page.evaluate(() => getComputedStyle(document.querySelector('.option1-root') || document.body).backgroundColor);
  const bgL = luminance(parseRgb(bgLight) || [249, 250, 251]);
  for (const item of contrastChecks) {
    const fgL = luminance(parseRgb(item.color) || [0, 0, 0]);
    const ratio = (Math.max(fgL, bgL) + 0.05) / (Math.min(fgL, bgL) + 0.05);
    check(`light theme contrast ${item.sel}`, ratio >= 4.5, `${item.color} on ${bgLight} = ${ratio.toFixed(2)}:1`);
  }
  await page.screenshot({ path: `${SHOTS}/page-light.png`, fullPage: false });

  // ─── Sidebar (630px rail on /map) ───
  await page.evaluate(() => document.documentElement.setAttribute('data-theme', 'dark'));
  await page.goto(`${BASE}/map?incident=${INCIDENT_ID}`, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('.id-sidebar, .id-summary', { timeout: 25000 });
  await sleep(2500);

  const sidebar = await page.evaluate(() => {
    const el = document.querySelector('.id-sidebar') || document.querySelector('.dashboard-right-panel') || document.querySelector('[class*="right-panel"]');
    if (!el) return null;
    const r = el.getBoundingClientRect();
    return { width: Math.round(r.width), scrollW: el.scrollWidth, clientW: el.clientWidth, found: true };
  });
  check('sidebar renders on /map', !!sidebar, JSON.stringify(sidebar));
  if (sidebar) {
    check(
      'sidebar: no horizontal overflow in 630px mode',
      sidebar.scrollW <= sidebar.clientW + 1,
      `scrollW=${sidebar.scrollW} clientW=${sidebar.clientW}`
    );
  }
  await page.screenshot({ path: `${SHOTS}/sidebar-dark.png`, fullPage: false });

  await page.evaluate(() => document.documentElement.setAttribute('data-theme', 'light'));
  await sleep(600);
  await page.screenshot({ path: `${SHOTS}/sidebar-light.png`, fullPage: false });

  check('no JS errors (whole run)', pageErrors.length === 0, pageErrors.slice(0, 2).join(' | '));

  console.log('\n================ SUMMARY ================');
  console.log(`${passed} passed, ${failed} failed`);
  await browser.close();
  process.exit(failed > 0 ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
