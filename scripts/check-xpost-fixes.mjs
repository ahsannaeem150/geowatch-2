import { chromium } from 'playwright';
import fs from 'node:fs';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const OUT = 'temp_screenshots/web-xpost-cards';
const b = await chromium.launch({ headless: true });
process.on('exit', () => {});

const p = await b.newPage({ viewport: { width: 1600, height: 950 } });
p.on('pageerror', (e) => console.log('PAGEERROR', String(e).slice(0, 300)));
p.on('console', (m) => { if (m.type() === 'error' || m.text().includes('LightboxVideo')) console.log('CERR', m.text().slice(0, 250)); });
p.on('response', (r) => { if (r.url().includes('fxtwitter')) console.log('FX', r.status(), r.url().slice(0, 80)); });


const token = fs.readFileSync('/tmp/im24-token', 'utf8').trim();
// headless test build lacks h264: swap tweet video URLs for a local webm
await p.route('**/api.fxtwitter.com/**', async (route) => {
  const res = await route.fetch();
  try {
    const j = await res.json();
    const vids = j?.tweet?.media?.videos;
    if (vids?.length) vids.forEach((v) => { v.url = 'http://localhost:3100/uploads/test/test-webm.webm'; });
    return route.fulfill({ response: res, json: j });
  } catch { return route.fulfill({ response: res }); }
});
await p.goto('http://localhost:5174/login', { waitUntil: 'domcontentloaded' });
await p.evaluate((t) => localStorage.setItem('intelmap24_token', t), token);
await p.goto('http://localhost:5174/incident/34d3e7b7-5daa-4d6a-85d3-29a1262780cb', { waitUntil: 'domcontentloaded' });
await sleep(4000);
await p.locator('.opt1-filter-tab', { hasText: 'Posts' }).first().click();
await sleep(2500);
const openAll = p.locator('.id-x-compact__collapse', { hasText: 'Open all' }).first();
if (await openAll.count()) await openAll.click();
try { await p.waitForSelector('.id-tw', { timeout: 30000, state: 'attached' }); } catch { console.log('no .id-tw attached'); }
console.log('id-tw count:', await p.locator('.id-tw').count());
console.log('loaders:', await p.locator('.id-x-embed__loader').count());
console.log('fallbacks:', await p.locator('.id-tw').count(), await p.locator('.id-x-embed').count());
console.log('compact rows:', await p.locator('.id-x-compact__item, .id-x-compact__row, .id-x-compact [class*=row]').count());

for (let i = 0; i < 30; i++) {
  if ((await p.locator('.id-x-embed__loader').count()) === 0) break;
  await sleep(1000);
}
console.log('after wait id-tw:', await p.locator('.id-tw').count());
await sleep(2000);

// badge close-up: first card header
const head = p.locator('.id-tw__head').first();
await head.scrollIntoViewIfNeeded();
await sleep(600);
await head.screenshot({ path: `${OUT}/badge-zoom.png` });

// find a video cell (has play badge) and open lightbox
const vcell = p.locator('.id-tw__cell:has(.id-tw__play)').first();
console.log('video cells:', await p.locator('.id-tw__cell:has(.id-tw__play)').count());
await vcell.scrollIntoViewIfNeeded();
await sleep(1000);
await vcell.click({ timeout: 10000 }).catch(async () => {
  await p.evaluate(() => document.querySelector('.id-tw__cell .id-tw__play')?.closest('.id-tw__cell')?.click());
});
await sleep(2500);
console.log('lightbox present:', await p.locator('.id-lightbox').count());
const lb = await p.locator('.id-lightbox').innerHTML().catch(()=>'');
console.log('lightbox has video tag:', lb.includes('<video'));
console.log('lightbox has error box:', lb.includes('video-error'));
console.log('lightbox img:', (lb.match(/<img[^>]*src="[^"]{0,60}/)||['none'])[0]);
const hasControls = await p.locator('.id-lightbox__video-controls').count();
console.log('custom controls:', hasControls);
const vstate = await p.evaluate(() => {
  const v = document.querySelector('.id-lightbox__video video');
  return v ? { paused: v.paused, dur: v.duration, err: v.error && v.error.code, ready: v.readyState } : null;
});
console.log('video state:', JSON.stringify(vstate));
await p.screenshot({ path: `${OUT}/video-player.png` });
await b.close();
console.log('done');
