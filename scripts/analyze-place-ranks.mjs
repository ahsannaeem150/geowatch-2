import { VectorTile } from '@mapbox/vector-tile';
import Protobuf from 'pbf';

const base = 'http://localhost:8080/tiles';
const tiles = [
  { z: 3, x: 5, y: 3 },
  { z: 4, x: 11, y: 6 },
  { z: 5, x: 22, y: 13 },
  { z: 6, x: 44, y: 26 },
];

for (const { z, x, y } of tiles) {
  const url = `${base}/${z}/${x}/${y}.pbf`;
  const res = await fetch(url);
  if (!res.ok) {
    console.error('failed', url, res.status);
    continue;
  }
  const buf = Buffer.from(await res.arrayBuffer());
  const tile = new VectorTile(new Protobuf(buf));
  const layer = tile.layers.place;
  if (!layer) {
    console.log(`z${z}/${x}/${y}: no place layer`);
    continue;
  }
  const byClass = {};
  for (let i = 0; i < layer.length; i++) {
    const f = layer.feature(i);
    const cls = f.properties.class;
    const rank = f.properties.rank;
    if (!byClass[cls]) byClass[cls] = [];
    byClass[cls].push({ rank, name: f.properties.name_en || f.properties.name });
  }
  console.log(`\n=== z${z}/${x}/${y} place features ===`);
  for (const cls of Object.keys(byClass).sort()) {
    const ranks = byClass[cls].map((d) => d.rank).filter((r) => r != null);
    ranks.sort((a, b) => a - b);
    const names = byClass[cls].slice(0, 10).map((d) => `${d.name}(r${d.rank ?? '?'})`).join(', ');
    console.log(`  ${cls}: count=${byClass[cls].length}, rank min=${ranks[0] ?? '?'}, max=${ranks[ranks.length - 1] ?? '?'}, sample: ${names}`);
  }
}
