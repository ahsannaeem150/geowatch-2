import { chromium } from 'playwright';

const BASE = 'http://localhost:5173';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
p.on('console', (m) => {
  const t = m.text();
  if (t.startsWith('[CAM]')) console.log(t);
});

await p.goto(`${BASE}/map`, { waitUntil: 'domcontentloaded' });
await p.waitForFunction(() => !!window.__intelmap24UserMap, { timeout: 20000 });
await sleep(2500);

const patch = () => p.evaluate(() => {
  const m = window.__intelmap24UserMap;
  if (!m || m.__camPatched) return;
  m.__camPatched = true;
  for (const fn of ['flyTo', 'easeTo', 'jumpTo', 'setZoom', 'fitBounds', 'setPadding']) {
    const orig = m[fn].bind(m);
    m[fn] = (...args) => {
      console.log(`[CAM] ${fn}(${JSON.stringify(args[0]) ?? ''}) ::`, new Error().stack.split('\n').slice(2, 4).join(' <- '));
      return orig(...args);
    };
  }
});
await patch();

const cam = async (label) => {
  const c = await p.evaluate(() => {
    const m = window.__intelmap24UserMap;
    const c = m.getCenter();
    return { lng: +c.lng.toFixed(4), lat: +c.lat.toFixed(4), zoom: +m.getZoom().toFixed(3), pad: m.getPadding() };
  });
  console.log(label, JSON.stringify(c));
};

// Same as sweep: fly to 56.3,26.6 z7, then select tanker via the drawer
await p.evaluate(() => window.__intelmap24UserMap.jumpTo({ center: [56.3, 26.6], zoom: 7 }));
await sleep(800);
await cam('after jumpTo');
// Canvas click at the projected point (sweep did this; it "missed" the marker)
const pt = await p.evaluate(() => window.__intelmap24UserMap.project([56.3, 26.6]));
await p.mouse.click(pt.x, pt.y);
await sleep(2500);
await cam('after canvas click');
console.log('url after canvas click:', p.url());
await p.click('button[title="Incidents"]');
await sleep(1500);
await p.locator('div[style*="cursor: pointer"]', { hasText: 'Tanker' }).first().click();
await sleep(2500);
await cam('after drawer select');
const fullBtn = p.locator('button.id-btn-primary', { hasText: 'Full details' }).first();
await fullBtn.click();
await sleep(2500);
console.log('detail url:', p.url());
await p.locator('button.opt1-back-link').first().click();
await p.waitForFunction(() => !!window.__intelmap24UserMap, { timeout: 20000 });
await patch();
await cam('back t+0');
await sleep(2000);
await cam('back t+2s');
await sleep(2500);
await cam('back t+4.5s');
await b.close();
