import { chromium } from 'playwright';

// Verify native fxtwitter tweet cards in admin-web incident sidebar.
const BASE = 'http://localhost:5174';
const INCIDENT_ID = '34d3e7b7-5daa-4d6a-85d3-29a1262780cb';
const OUT = 'temp_screenshots/web-xpost-cards';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function main() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1600, height: 950 } });

  // login via token injection (avoids auth rate limiter)
  const res = await page.request.post('http://localhost:3100/api/v1/auth/login', {
    data: { email: 'editor@geowatch.local', password: 'EditorPass123!' },
  });
  const { data } = await res.json();
  await page.goto(`${BASE}/login`, { waitUntil: 'domcontentloaded' });
  await page.evaluate((t) => localStorage.setItem('intelmap24_token', t), data.token);

  await page.goto(`${BASE}/incident/${INCIDENT_ID}`, { waitUntil: 'domcontentloaded' });
  await sleep(4000);

  // open X POSTS pane in the evidence rail
  const xpTab = page.locator('.opt1-filter-tab', { hasText: 'Posts' }).first();
  console.log('xp tabs found:', await page.locator('.opt1-filter-tab').count());
  if (await xpTab.count()) { await xpTab.click(); }
  try { await page.waitForSelector('.id-tw', { timeout: 20000 }); } catch {}
  await sleep(3000);
  const cards = await page.locator('.id-tw').count();
  console.log('tweet cards rendered:', cards);
  await page.screenshot({ path: `${OUT}/dark-full.png`, fullPage: false });

  // scroll to tweets if an evidence/rail section exists
  const firstCard = page.locator('.id-tw').first();
  if (cards > 0) {
    await firstCard.scrollIntoViewIfNeeded();
    await sleep(1500);
    await page.screenshot({ path: `${OUT}/dark-tweets.png` });

    // open lightbox from first media cell
    const cell = page.locator('.id-tw__cell').first();
    if (await cell.count()) {
      await cell.click();
      await sleep(1200);
      await page.screenshot({ path: `${OUT}/lightbox.png` });
      await page.keyboard.press('Escape');
      await sleep(500);
    }
  }

  // light theme
  await page.evaluate(() => document.documentElement.setAttribute('data-theme', 'light'));
  await sleep(800);
  if (cards > 0) {
    await firstCard.scrollIntoViewIfNeeded();
    await sleep(600);
  }
  await page.screenshot({ path: `${OUT}/light-tweets.png` });

  await browser.close();
  console.log('done');
}
main().catch((e) => { console.error(e); process.exit(1); });
