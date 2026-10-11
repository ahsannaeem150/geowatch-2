// Zone GeoJSON helpers — bbox + centroid from a Polygon/MultiPolygon
// geometry. Zones carry no latitude/longitude columns, so flights target the
// ring-derived centroid and fit against the bbox (web: zoneGeometry.js
// getZoneBounds/getZoneCentroid).

export function zoneBBox(geometry) {
  const pts = [];
  if (geometry?.type === 'Polygon') {
    pts.push(...(geometry.coordinates?.[0] || []));
  } else if (geometry?.type === 'MultiPolygon') {
    geometry.coordinates.forEach((p) => pts.push(...(p[0] || [])));
  }
  if (!pts.length) {
    return null;
  }
  let west = Infinity;
  let south = Infinity;
  let east = -Infinity;
  let north = -Infinity;
  pts.forEach(([x, y]) => {
    west = Math.min(west, x);
    south = Math.min(south, y);
    east = Math.max(east, x);
    north = Math.max(north, y);
  });
  return [west, south, east, north];
}

export function zoneCentroid(geometry) {
  const ring = geometry?.coordinates?.[0];
  if (!Array.isArray(ring) || !ring.length) {
    return null;
  }
  let sx = 0;
  let sy = 0;
  ring.forEach((pair) => {
    sx += Number(pair[0]);
    sy += Number(pair[1]);
  });
  return [sx / ring.length, sy / ring.length];
}
