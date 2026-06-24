import { VectorTile } from '@mapbox/vector-tile';
import Protobuf from 'pbf';

const base = 'http://localhost:8080/tiles';
const tiles = [
  { z: 3, x: 5, y: 3 },
  { z: 4, x: 11, y: 6 },
  { z: 5, x: 22, y: 13 },
];

for (const { z, x, y } of tiles) {
  const res = await fetch(`${base}/${z}/${x}/${y}.pbf`);
  const tile = new VectorTile(new Protobuf(Buffer.from(await res.arrayBuffer())));
  const layer = tile.layers.place;
  if (!layer) continue;
  for (let i = 0; i < layer.length; i++) {
    const f = layer.feature(i);
    const name = f.properties.name_en || f.properties.name;
    if (name && /Balochistan|Punjab|Haryana|Rajasthan/i.test(name)) {
      console.log(`z${z}/${x}/${y}: class=${f.properties.class} rank=${f.properties.rank} name=${name}`);
    }
  }
}
