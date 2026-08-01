import { chromium } from 'playwright';

/**
 * check-incident-detail-fixes.mjs — repro/verify the three incident-detail
 * fixes on the public user-web page (no login):
 *   Bug 1: clicking the SECOND timeline item opens the SECOND update (not the first)
 *   Bug 2: featured item's original collapses to a marker row; marker expands it
 *   Bug 3: Back navigates deterministically to /map
 */

const BASE = 'http://localhost:5173';
const INCIDENT_ID = '477fc53b-3530-4cf9-806c-85eac8e02290'; // 2 updates, both with featured X posts

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

async function main() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1600, height: 950 } });

  await page.goto(`${BASE}/incident/${INCIDENT_ID}`, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('.opt1-event', { timeout: 20000 });
  await sleep(1500);

  // ─── Bug 1: second timeline item opens the second update ───
  const eventTitles = await page.$$eval('.opt1-event .opt1-event-title', (els) => els.map((e) => e.textContent.trim()));
  check('two timeline events render', eventTitles.length === 2, `${eventTitles.length} events`);

  const railTitle0 = await page.locator('.opt1-rail-title').textContent();
  await page.locator('.opt1-event').nth(1).click();
  await sleep(1200);
  const railTitle1 = (await page.locator('.opt1-rail-title').textContent()).trim();
  check(
    'bug1: clicking 2nd event opens the 2nd update in the rail',
    railTitle1 === eventTitles[1] && railTitle1 !== railTitle0.trim(),
    `rail="${railTitle1.slice(0, 60)}" expected="${(eventTitles[1] || '').slice(0, 60)}"`
  );

  // Staying put (no reset back to the first)
  await sleep(1500);
  const railTitle2 = (await page.locator('.opt1-rail-title').textContent()).trim();
  check('bug1: selection does not snap back to the first update', railTitle2 === eventTitles[1]);

  // ─── Bug 2: featured original collapses to a marker, expands on demand ───
  const featuredBlocks = await page.locator('.opt1-featured-block').count();
  check('bug2: featured block renders at top', featuredBlocks >= 1, `${featuredBlocks} blocks`);
  const markers0 = await page.locator('.opt1-featured-collapsed').count();
  check('bug2: featured original collapsed to marker row', markers0 >= 1, `${markers0} markers`);
  if (markers0 >= 1) {
    await page.locator('.opt1-featured-collapsed').first().click();
    await sleep(800);
    const markers1 = await page.locator('.opt1-featured-collapsed').count();
    const featuredListItems = await page.locator('.id-x-compact__item[data-featured="true"]').count();
    check(
      'bug2: marker expands the original item inline',
      markers1 === markers0 - 1 && featuredListItems >= 1,
      `markers ${markers0}→${markers1}, featured list items=${featuredListItems}`
    );
  }

  // ─── Bug 3: Back navigates deterministically to /map ───
  await page.locator('.opt1-back-link').click();
  await sleep(1500);
  const url = page.url();
  check('bug3: Back lands on /map', url.startsWith(`${BASE}/map`), url);

  console.log('\n================ SUMMARY ================');
  console.log(`${passed} passed, ${failed} failed`);
  await browser.close();
  process.exit(failed > 0 ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
