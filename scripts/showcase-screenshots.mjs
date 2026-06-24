import { chromium } from 'playwright';
import { execFileSync } from 'child_process';
import { existsSync, mkdirSync, readdirSync, unlinkSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const OUT = join(ROOT, 'screenshots', 'showcase-feature-captures');
const FFMPEG = join(ROOT, 'tools', 'ffmpeg');

const USER_BASE = 'http://localhost:5173';
const ADMIN_BASE = 'http://localhost:5174';
const SUPER_BASE = 'http://localhost:5175';
const VIEWPORT = { width: 1920, height: 1080 };

const INCIDENT_ID = '477fc53b-3530-4cf9-806c-85eac8e02290';
const ZONE_ID = '3f9fdd45-d2ca-4a9d-a0de-852cff1f3be7';
const GHOST_INCIDENT_ID = 'e8500887-2d31-473d-ab8a-103ce2cde026';
const GHOST_ZONE_ID = 'c25ec8cd-e9b9-4880-8c6c-67f999b02e06';

const ADMIN_EMAIL = 'admin@geowatch.local';
const ADMIN_PASSWORD = 'AdminPass123!';

const DOMAIN_NAMES = [
  'Conflict',
  'Terrorism & Asymmetric',
  'Counter-Terrorism & Security Ops',
  'Civil Unrest',
  'Military Posture & Movement',
  'Natural Hazard',
  'Infrastructure & Industrial',
  'Health Emergency',
  'Humanitarian & Migration',
  'Political & Governance',
  'Cyber & Information',
  'Maritime',
  'Economic Shock',
  'Environmental',
  'CBRN & WMD',
  'Transport & Aviation',
  'Intelligence',
];

function ensureDirs() {
  const dirs = [
    join(OUT, 'user-web'),
    join(OUT, 'map'),
    join(OUT, 'incident-detail'),
    join(OUT, 'zone-detail'),
    join(OUT, 'ghost'),
    join(OUT, 'gifs'),
    join(OUT, 'admin-curation'),
    join(OUT, 'superadmin'),
  ];
  for (const d of dirs) {
    if (!existsSync(d)) mkdirSync(d, { recursive: true });
  }
}

function clearVideoDir() {
  const vd = join(ROOT, 'temp_videos');
  if (existsSync(vd)) {
    for (const f of readdirSync(vd)) unlinkSync(join(vd, f));
  }
  return vd;
}

function toGif(webmPath, gifPath, opts = {}) {
  const { fps = 18, width = 960, start = 0, duration } = opts;
  const filter = `fps=${fps},scale=${width}:-1:flags=lanczos,split[s0][s1];[s0]palettegen=max_colors=128[p];[s1][p]paletteuse=dither=bayer`;
  const args = ['-y', '-i', webmPath, '-vf', filter, '-loop', '0'];
  if (start) args.push('-ss', String(start));
  if (duration) args.push('-t', String(duration));
  args.push(gifPath);
  execFileSync(FFMPEG, args, { stdio: 'pipe' });
  console.log('Saved GIF', gifPath);
}

async function setTheme(page, theme, style) {
  await page.evaluate(
    ({ theme, style }) => {
      localStorage.setItem('geowatch-theme', theme);
      localStorage.setItem('geowatch-style', style);
    },
    { theme, style }
  );
}

async function waitForMapLoad(page) {
  await page.waitForSelector('.maplibregl-canvas', { timeout: 20000 }).catch(() => {});
  await page.waitForTimeout(1500);
}

async function screenshot(page, path, opts = {}) {
  const { wait = 800, fullPage = false } = opts;
  if (wait) await page.waitForTimeout(wait);
  await page.screenshot({ path, fullPage });
  console.log('Saved', path);
}

async function expandLegend(page) {
  const btn = page.locator('button', { hasText: 'Legend' }).first();
  if (await btn.count()) {
    const body = await page.locator('button:has-text("Hide all")').count();
    if (!body) await btn.click();
    await page.waitForTimeout(300);
  }
}

async function collapseLegend(page) {
  const btn = page.locator('button', { hasText: 'Legend' }).first();
  const body = await page.locator('button:has-text("Hide all")').count();
  if (body) await btn.click();
  await page.waitForTimeout(300);
}

async function hideAllDomains(page) {
  await expandLegend(page);
  await page.click('button:has-text("Hide all")');
  await page.waitForTimeout(400);
}

async function showDomain(page, name) {
  const buttons = await page.locator('button').all();
  for (const btn of buttons) {
    const text = await btn.textContent().catch(() => '');
    if (text.trim() === name) {
      await btn.click();
      await page.waitForTimeout(250);
      return;
    }
  }
}

async function prepareCleanMap(page, keep = ['Conflict', 'Zones']) {
  await waitForMapLoad(page);
  await hideAllDomains(page);
  for (const name of keep) await showDomain(page, name);
  await page.waitForTimeout(800);
}

async function loginAdmin(page) {
  await page.goto(`${ADMIN_BASE}/login`);
  await page.fill('input[type="email"]', ADMIN_EMAIL);
  await page.fill('input[type="password"]', ADMIN_PASSWORD);
  await page.click('button[type="submit"]');
  await page.waitForURL(/^(http:\/\/localhost:5174\/?)$/, { timeout: 15000 });
  await page.waitForTimeout(1200);
}

ensureDirs();

(async () => {
  const browser = await chromium.launch();

  // ============================================================
  // USER-WEB HOMEPAGE
  // ============================================================
  console.log('\n=== Homepage hero combinations ===');
  for (const style of ['tactical', 'saas', 'glass']) {
    for (const theme of ['dark', 'light']) {
      const context = await browser.newContext({ viewport: VIEWPORT });
      const page = await context.newPage();
      // Set theme/style before first navigation so page renders correctly on load
      await page.goto(`${USER_BASE}/`);
      await setTheme(page, theme, style);
      await page.goto('about:blank');
      await page.goto(`${USER_BASE}/`, { waitUntil: 'networkidle' });
      await page.waitForTimeout(4000);
      await screenshot(page, join(OUT, 'user-web', `homepage-hero-${style}-${theme}.png`), { wait: 0 });
      await page.evaluate(() => window.scrollTo(0, 220));
      await screenshot(page, join(OUT, 'user-web', `homepage-hero-${style}-${theme}-scrolled.png`));
      await page.close();
      await context.close();
    }
  }

  console.log('\n=== Homepage sections (default) ===');
  {
    const page = await browser.newPage({ viewport: VIEWPORT });
    await page.goto(`${USER_BASE}/`);
    await setTheme(page, 'dark', 'tactical');
    await page.reload({ waitUntil: 'networkidle' });
    await page.waitForTimeout(3000);

    await page.evaluate(() => window.scrollTo(0, 0));
    await screenshot(page, join(OUT, 'user-web', 'homepage-hero-default.png'));

    const sections = [
      { name: 'stats', y: 950 },
      { name: 'categories', y: 1550 },
      { name: 'featured-events', y: 2200 },
      { name: 'news-ticker', y: 2900 },
      { name: 'footer', y: 3600 },
    ];
    for (const sec of sections) {
      await page.evaluate((y) => window.scrollTo(0, y), sec.y);
      await screenshot(page, join(OUT, 'user-web', `homepage-section-${sec.name}.png`));
    }
    await page.close();
  }

  // ============================================================
  // MAP PAGE - INCIDENT SELECTED
  // ============================================================
  console.log('\n=== Map incident selected ===');
  {
    const page = await browser.newPage({ viewport: VIEWPORT });
    await page.goto(`${USER_BASE}/map?incident=${INCIDENT_ID}&lat=26.897114&lng=55.906013&zoom=6.66`);
    await setTheme(page, 'dark', 'tactical');
    await page.reload({ waitUntil: 'networkidle' });
    await prepareCleanMap(page, ['Economic Shock', 'Zones']);
    await screenshot(page, join(OUT, 'map', 'map-incident-selected-clean.png'));

    // Legend expanded
    await expandLegend(page);
    await screenshot(page, join(OUT, 'map', 'map-legend-expanded.png'));

    // Legend collapsed
    await collapseLegend(page);
    await screenshot(page, join(OUT, 'map', 'map-legend-collapsed.png'));

    // Live activity feed
    const feedHeader = page.locator('[class*="LiveActivityFeed"], [class*="live-activity"]').first();
    const toggle = page.locator('button').filter({ hasText: /Live Activity|unread|\d+/ }).first();
    if (await toggle.isVisible().catch(() => false)) {
      await toggle.click();
      await screenshot(page, join(OUT, 'map', 'map-live-activity-feed.png'));
    }

    // Ticker bar visible at bottom
    await screenshot(page, join(OUT, 'map', 'map-ticker-bar.png'));

    // Sidebar detail
    await screenshot(page, join(OUT, 'incident-detail', 'incident-detail-sidebar.png'));
    await page.close();
  }

  // ============================================================
  // MAP PAGE - ZONE SELECTED
  // ============================================================
  console.log('\n=== Map zone selected ===');
  {
    const page = await browser.newPage({ viewport: VIEWPORT });
    await page.goto(`${USER_BASE}/map?zone=${ZONE_ID}&lat=20.229310&lng=87.507397&zoom=7.72`);
    await setTheme(page, 'dark', 'tactical');
    await page.reload({ waitUntil: 'networkidle' });
    await prepareCleanMap(page, ['Economic Shock', 'Zones']);
    await screenshot(page, join(OUT, 'map', 'map-zone-selected-clean.png'));
    await screenshot(page, join(OUT, 'zone-detail', 'zone-detail-sidebar.png'));
    await page.close();
  }

  // ============================================================
  // MAP PAGE - FILTERS & SEARCH
  // ============================================================
  console.log('\n=== Map filters and search ===');
  {
    const page = await browser.newPage({ viewport: VIEWPORT });
    await page.goto(`${USER_BASE}/map`);
    await setTheme(page, 'dark', 'tactical');
    await page.reload({ waitUntil: 'networkidle' });
    await prepareCleanMap(page, ['Economic Shock', 'Maritime', 'Zones']);

    // Location search
    const searchInput = page.locator('input[placeholder*="Search"]').first();
    if (await searchInput.isVisible().catch(() => false)) {
      await searchInput.fill('Strait of Hormuz');
      await page.waitForTimeout(1000);
      await screenshot(page, join(OUT, 'map', 'map-location-search.png'));
      await page.keyboard.press('Escape');
      await page.waitForTimeout(300);
    }

    // Date controls
    await page.click('button:has-text("Today")').catch(() => {});
    await screenshot(page, join(OUT, 'map', 'map-controls-today.png'));

    // Verified only toggle
    const verifiedBtn = page.locator('button').filter({ hasText: 'Verified Only' }).first();
    if (await verifiedBtn.isVisible().catch(() => false)) {
      await verifiedBtn.click();
      await page.waitForTimeout(500);
      await screenshot(page, join(OUT, 'map', 'map-verified-only.png'));
      await verifiedBtn.click();
    }

    await page.close();
  }

  // ============================================================
  // GHOST MARKER / GHOST ZONE
  // ============================================================
  console.log('\n=== Ghost incident ===');
  {
    const page = await browser.newPage({ viewport: VIEWPORT });
    await page.goto(`${USER_BASE}/map?incident=${GHOST_INCIDENT_ID}&lat=33.5138&lng=36.2765&zoom=8`);
    await setTheme(page, 'dark', 'tactical');
    await page.reload({ waitUntil: 'networkidle' });
    await prepareCleanMap(page, ['Economic Shock', 'Zones']);
    await screenshot(page, join(OUT, 'ghost', 'ghost-incident-marker.png'));
    await page.close();
  }

  console.log('\n=== Ghost zone ===');
  {
    const page = await browser.newPage({ viewport: VIEWPORT });
    await page.goto(`${USER_BASE}/map?zone=${GHOST_ZONE_ID}&lat=43.85&lng=33.0&zoom=6`);
    await setTheme(page, 'dark', 'tactical');
    await page.reload({ waitUntil: 'networkidle' });
    await prepareCleanMap(page, ['Economic Shock', 'Zones']);
    await screenshot(page, join(OUT, 'ghost', 'ghost-zone-polygon.png'));
    await page.close();
  }

  // ============================================================
  // FULL-PAGE DETAIL VIEWS
  // ============================================================
  console.log('\n=== Full-page incident detail ===');
  {
    const page = await browser.newPage({ viewport: VIEWPORT });
    await page.goto(`${USER_BASE}/incident/${INCIDENT_ID}`);
    await setTheme(page, 'dark', 'tactical');
    await page.reload({ waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);
    await screenshot(page, join(OUT, 'incident-detail', 'incident-detail-full-overview.png'));

    for (const sec of [
      { name: 'timeline', y: 1000 },
      { name: 'evidence', y: 1700 },
      { name: 'sources', y: 2500 },
    ]) {
      await page.evaluate((y) => window.scrollTo(0, y), sec.y);
      await screenshot(page, join(OUT, 'incident-detail', `incident-detail-full-${sec.name}.png`));
    }
    await page.close();
  }

  console.log('\n=== Full-page zone detail ===');
  {
    const page = await browser.newPage({ viewport: VIEWPORT });
    await page.goto(`${USER_BASE}/zone/${ZONE_ID}`);
    await setTheme(page, 'dark', 'tactical');
    await page.reload({ waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);
    await screenshot(page, join(OUT, 'zone-detail', 'zone-detail-full-overview.png'));
    await page.close();
  }

  // ============================================================
  // AUTH MODAL
  // ============================================================
  console.log('\n=== Sign-in modal ===');
  {
    const page = await browser.newPage({ viewport: VIEWPORT });
    await page.goto(`${USER_BASE}/map?incident=${INCIDENT_ID}&lat=26.897114&lng=55.906013&zoom=6.66`);
    await setTheme(page, 'dark', 'tactical');
    await page.reload({ waitUntil: 'networkidle' });
    await waitForMapLoad(page);
    await page.waitForTimeout(1500);
    // Click first star/save button
    const saveBtn = page.locator('button').filter({ has: page.locator('svg') }).first();
    // Try to find a button with title/aria-label containing save/star
    const allBtns = await page.locator('button').all();
    for (const btn of allBtns) {
      const title = (await btn.getAttribute('title').catch(() => '')) || '';
      const aria = (await btn.getAttribute('aria-label').catch(() => '')) || '';
      if (title.toLowerCase().includes('save') || aria.toLowerCase().includes('save')) {
        await btn.click();
        break;
      }
    }
    await page.waitForTimeout(1000);
    await screenshot(page, join(OUT, 'user-web', 'sign-in-modal.png'));
    await page.close();
  }

  // ============================================================
  // ADMIN CURATION
  // ============================================================
  console.log('\n=== Admin curation ===');
  {
    const page = await browser.newPage({ viewport: VIEWPORT });
    await loginAdmin(page);
    await screenshot(page, join(OUT, 'admin-curation', 'admin-dashboard-map.png'));

    await page.goto(`${ADMIN_BASE}/incident/${INCIDENT_ID}`);
    await page.waitForTimeout(2200);
    await screenshot(page, join(OUT, 'admin-curation', 'admin-incident-detail.png'));

    // Scroll to timeline/sources sections
    await page.evaluate(() => window.scrollTo(0, 900));
    await screenshot(page, join(OUT, 'admin-curation', 'admin-incident-timeline.png'));

    await page.goto(`${ADMIN_BASE}/incident/${ZONE_ID}`);
    await page.waitForTimeout(2200);
    await screenshot(page, join(OUT, 'admin-curation', 'admin-zone-detail.png'));

    // Search modal
    await page.goto(`${ADMIN_BASE}/`);
    await page.waitForTimeout(1000);
    const searchBtn = page.locator('button').filter({ hasText: /Search|Find/ }).first();
    if (await searchBtn.isVisible().catch(() => false)) {
      await searchBtn.click();
      await page.waitForTimeout(600);
      await screenshot(page, join(OUT, 'admin-curation', 'admin-search-modal.png'));
    }

    await page.close();
  }

  // ============================================================
  // SUPERADMIN (small set)
  // ============================================================
  console.log('\n=== Superadmin ===');
  {
    const page = await browser.newPage({ viewport: VIEWPORT });
    await page.goto(`${SUPER_BASE}/login`);
    await page.fill('input[type="email"]', ADMIN_EMAIL);
    await page.fill('input[type="password"]', ADMIN_PASSWORD);
    await page.click('button[type="submit"]');
    await page.waitForURL(/^(http:\/\/localhost:5175\/?|.*\/superadmin)$/, { timeout: 15000 });
    await page.waitForTimeout(1500);
    await screenshot(page, join(OUT, 'superadmin', 'superadmin-dashboard.png'));

    await page.goto(`${SUPER_BASE}/superadmin/domains`);
    await page.waitForTimeout(1500);
    await screenshot(page, join(OUT, 'superadmin', 'superadmin-domains-taxonomy.png'));

    await page.goto(`${SUPER_BASE}/superadmin/audit`);
    await page.waitForTimeout(1500);
    await screenshot(page, join(OUT, 'superadmin', 'superadmin-audit-log.png'));

    await page.close();
  }

  // ============================================================
  // GIFS
  // ============================================================
  console.log('\n=== Recording GIFs ===');
  const videoDir = clearVideoDir();

  async function recordGif(name, url, setupFn, duration = 4000) {
    const context = await browser.newContext({
      viewport: VIEWPORT,
      recordVideo: { dir: videoDir, size: { width: VIEWPORT.width, height: VIEWPORT.height } },
    });
    const page = await context.newPage();
    await page.goto(url, { waitUntil: 'networkidle' });
    await setupFn(page);
    await page.waitForTimeout(duration);
    await page.close();
    await context.close();
    const videos = readdirSync(videoDir).filter((f) => f.endsWith('.webm'));
    if (videos.length) {
      const src = join(videoDir, videos[0]);
      const dst = join(OUT, 'gifs', `${name}.gif`);
      toGif(src, dst, { width: 960, fps: 18 });
      unlinkSync(src);
    }
  }

  // GIF: homepage boot sequence
  await recordGif(
    'homepage-boot-sequence',
    `${USER_BASE}/`,
    async (page) => {
      await setTheme(page, 'dark', 'tactical');
      await page.reload({ waitUntil: 'networkidle' });
    },
    4500
  );

  // GIF: style switcher on homepage
  await recordGif(
    'homepage-style-switcher',
    `${USER_BASE}/`,
    async (page) => {
      await setTheme(page, 'dark', 'tactical');
      await page.reload({ waitUntil: 'networkidle' });
      await page.waitForTimeout(2800);
      await page.click('header button:has-text("Tac")');
      await page.waitForTimeout(400);
      await page.click('button:has-text("Glass")');
      await page.waitForTimeout(800);
      await page.click('header button:has-text("Glass")');
      await page.waitForTimeout(400);
      await page.click('button:has-text("SaaS")');
      await page.waitForTimeout(800);
      await page.click('header button:has-text("SaaS")');
      await page.waitForTimeout(400);
      await page.click('button:has-text("Tac")');
    },
    4000
  );

  // GIF: map fly-to incident
  await recordGif(
    'map-fly-to-incident',
    `${USER_BASE}/map`,
    async (page) => {
      await setTheme(page, 'dark', 'tactical');
      await page.reload({ waitUntil: 'networkidle' });
      await prepareCleanMap(page, ['Economic Shock', 'Zones']);
      await page.waitForTimeout(800);
      await page.goto(`${USER_BASE}/map?incident=${INCIDENT_ID}&lat=26.897114&lng=55.906013&zoom=6.66`);
      await page.waitForTimeout(2500);
    },
    3500
  );

  // GIF: live ticker scroll
  await recordGif(
    'live-ticker-scroll',
    `${USER_BASE}/map`,
    async (page) => {
      await setTheme(page, 'dark', 'tactical');
      await page.reload({ waitUntil: 'networkidle' });
      await prepareCleanMap(page, ['Economic Shock', 'Zones']);
      // Hover over ticker to pause, then leave
      const ticker = page.locator('[class*="TickerBar"], [class*="ticker"]').first();
      if (await ticker.isVisible().catch(() => false)) {
        await ticker.hover();
        await page.waitForTimeout(800);
        await page.mouse.move(0, 0);
      }
    },
    4000
  );

  // GIF: legend toggle
  await recordGif(
    'legend-toggle',
    `${USER_BASE}/map`,
    async (page) => {
      await setTheme(page, 'dark', 'tactical');
      await page.reload({ waitUntil: 'networkidle' });
      await waitForMapLoad(page);
      // Start with legend expanded
      await expandLegend(page);
      await page.waitForTimeout(400);
      // Hide all domains
      await page.click('button:has-text("Hide all")');
      await page.waitForTimeout(700);
      // Show all domains
      await page.click('button:has-text("Show all")');
      await page.waitForTimeout(700);
      // Collapse legend
      await collapseLegend(page);
    },
    3500
  );

  await browser.close();
  console.log('\n=== All captures complete ===');
})();
