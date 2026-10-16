import { chromium } from 'playwright';
import fs from 'node:fs';
const sleep=(ms)=>new Promise(r=>setTimeout(r,ms));
const b = await chromium.launch({ headless: true });
const p = await b.newPage({ viewport: { width: 1600, height: 950 } });
const token = fs.readFileSync('/tmp/im24-token','utf8').trim();
await p.goto('http://localhost:5174/login', { waitUntil: 'domcontentloaded' });
await p.evaluate(t => localStorage.setItem('intelmap24_token', t), token);
await p.goto('http://localhost:5174/incident/34d3e7b7-5daa-4d6a-85d3-29a1262780cb', { waitUntil: 'domcontentloaded' });
await sleep(4000);
await p.locator('.opt1-filter-tab', { hasText: 'Posts' }).first().click();
await sleep(2500);
const oa = p.locator('.id-x-compact__collapse', { hasText: 'Open all' }).first();
if (await oa.count()) await oa.click();
// wait for all loaders to finish (fxtwitter latency)
for (let i = 0; i < 40; i++) {
  if ((await p.locator('.id-x-embed__loader').count()) === 0) break;
  await sleep(1000);
}
console.log('tweets rendered:', await p.locator('.id-tw').count());
console.log('checking spinners:', await p.locator('.id-x-checking-notice').count());
// wait past the 7s render-timeout + TTL check window
await sleep(12000);
console.log('after wait tweets:', await p.locator('.id-tw').count());
console.log('archive notices:', await p.locator('.id-x-archive-notice').count());
console.log('Try-original (archived) actions:', (await p.locator('.id-x-compact__actions').allInnerTexts()).filter(t => t.includes('Try original')).length);
await p.locator('.id-tw').first().scrollIntoViewIfNeeded();
await sleep(800);
await p.screenshot({ path: 'temp_screenshots/web-xpost-cards/stayalive.png' });
await b.close();
console.log('done');
