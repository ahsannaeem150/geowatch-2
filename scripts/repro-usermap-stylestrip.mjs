import { chromium } from 'playwright';

const ZONE_ID = 'b8aa6cdb-50c1-4b4c-9bc6-ccb145a70862';

// Get zone geometry → centroid
const zres = await fetch(`http://localhost:3100/api/v1/incidents/${ZONE_ID}`);
const zjson = await zres.json();
const zone = zjson.data.incident;
const ring = zone.geometry.coordinates[0];
const centroid = ring.reduce((a, [lng, lat]) => [a[0] + lng / ring.length, a[1] + lat / ring.length], [0, 0]);

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
await page.goto('http://localhost:5173/map', { waitUntil: 'domcontentloaded', timeout: 60000 });
await page.waitForFunction(() => window.__geowatchUserMap?.getLayer('zone-hit'), null, { timeout: 30000 });

// Aim the map at the zone and let data settle
await page.evaluate(([lng, lat]) => {
  window.__geowatchUserMap.jumpTo({ center: [lng, lat], zoom: 9 });
}, centroid);
await page.waitForTimeout(2500);

const hitTest = () => page.evaluate(([lng, lat]) => {
  const m = window.__geowatchUserMap;
  const pt = m.project([lng, lat]);
  return {
    layerPresent: !!m.getLayer('zone-hit'),
    features: m.queryRenderedFeatures(pt, { layers: ['zone-hit'] }).length,
    styleLoaded: m.isStyleLoaded(),
  };
}, centroid);

const before = await hitTest();
console.log('BEFORE setStyle:', JSON.stringify(before));

// Exactly what the theme-change effect does (UserMap.jsx:636)
await page.evaluate(() => window.__geowatchUserMap.setStyle('/map-style-light.json'));
await page.waitForTimeout(2500);

const after = await hitTest();
console.log('AFTER setStyle:', JSON.stringify(after));

await browser.close();
