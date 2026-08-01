import { chromium } from 'playwright';

/** Cheap DOM checks: brand click → / ; hover-intent reveals nav; focus reveals; pill stays centered. */
const USER_BASE = 'http://localhost:5173';
let passed = 0, failed = 0;
const check = (name, ok, detail = '') => {
  ok ? passed++ : failed++;
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ` — ${detail}` : ''}`);
};
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

await page.goto(`${USER_BASE}/map`, { waitUntil: 'domcontentloaded' });
await page.waitForFunction(() => !!window.__geowatchUserMap, { timeout: 20000 });
await sleep(4500); // settle (fresh profile may auto-peek: 1.2s reveal + 2.5s)

// ─── Hover-intent: quick pass does NOT reveal ───
const brandBtn = page.locator('header button[title="GeoWatch home — hover for navigation"]');
const navCount = () => page.locator('header nav a').count();
const brandBox = await brandBtn.boundingBox();
await page.mouse.move(brandBox.x - 60, brandBox.y + brandBox.height / 2);
await page.mouse.move(brandBox.x + brandBox.width / 2, brandBox.y + brandBox.height / 2, { steps: 2 });
await page.mouse.move(brandBox.x - 60, brandBox.y + brandBox.height / 2, { steps: 2 });
await sleep(400); // longer than the 175ms intent delay
check('quick mouse pass does not reveal nav', (await navCount()) === 0, `${await navCount()} links`);

// ─── Hover (intent delay) reveals; leave hides after grace ───
await brandBtn.hover();
await sleep(600);
check('hover reveals nav (3 links)', (await navCount()) === 3, `${await navCount()} links`);
await page.mouse.move(brandBox.x - 80, brandBox.y + 300); // leave brand+nav area
await sleep(700); // > 250ms grace
check('mouse-leave hides nav after grace', (await navCount()) === 0, `${await navCount()} links`);

// ─── Keyboard focus reveals ───
await brandBtn.focus();
await sleep(300);
check('keyboard focus reveals nav', (await navCount()) === 3, `${await navCount()} links`);
await page.evaluate(() => document.activeElement.blur());
await sleep(700);

// ─── Pill cluster centered in both states ───
const pillCenter = () =>
  page.evaluate(() => {
    const cluster = document.querySelector('.tbm')?.parentElement;
    const r = cluster.getBoundingClientRect();
    return { c: r.x + r.width / 2, v: window.innerWidth / 2 };
  });
await brandBtn.hover();
await sleep(600);
const pc = await pillCenter();
check('pill cluster centered with nav revealed (±3px)', Math.abs(pc.c - pc.v) <= 3, `${pc.c.toFixed(1)} vs ${pc.v.toFixed(1)}`);
await page.mouse.move(brandBox.x - 80, brandBox.y + 300);
await sleep(700);
const pc2 = await pillCenter();
check('pill cluster centered with nav hidden (±3px)', Math.abs(pc2.c - pc2.v) <= 3, `${pc2.c.toFixed(1)} vs ${pc2.v.toFixed(1)}`);

// ─── Brand click navigates home ───
await brandBtn.click();
await sleep(1200);
check('brand click navigates to /', new URL(page.url()).pathname === '/', page.url());

console.log(`\n${passed} passed, ${failed} failed`);
await browser.close();
process.exit(failed > 0 ? 1 : 0);
