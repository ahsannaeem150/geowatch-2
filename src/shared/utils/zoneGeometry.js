/**
 * GeoWatch — shared polygon geometry helpers for zone incidents.
 * All functions assume a GeoJSON Polygon exterior ring: [lng, lat] pairs
 * where the last point equals the first.
 */

export function getPolygonBounds(ring) {
  if (!ring || ring.length === 0) return null;
  let minLng = Infinity;
  let minLat = Infinity;
  let maxLng = -Infinity;
  let maxLat = -Infinity;
  for (const [lng, lat] of ring) {
    if (lng < minLng) minLng = lng;
    if (lat < minLat) minLat = lat;
    if (lng > maxLng) maxLng = lng;
    if (lat > maxLat) maxLat = lat;
  }
  return {
    minLng,
    minLat,
    maxLng,
    maxLat,
    centerLng: (minLng + maxLng) / 2,
    centerLat: (minLat + maxLat) / 2,
  };
}

export function getPolygonCentroid(ring) {
  if (!ring || ring.length === 0) return null;
  let x = 0;
  let y = 0;
  const count = ring.length;
  for (const [lng, lat] of ring) {
    x += lng;
    y += lat;
  }
  return { lng: x / count, lat: y / count };
}

/**
 * Build an SVG path and viewBox for a polygon ring.
 * Returns { path, viewBox, width, height, centroid }.
 */
export function buildPolygonSvgProjection(ring, width = 320, height = 180, padding = 16) {
  const bounds = getPolygonBounds(ring);
  if (!bounds) return null;

  const { minLng, minLat, maxLng, maxLat } = bounds;
  const boundsWidth = Math.max(maxLng - minLng, 0.0001);
  const boundsHeight = Math.max(maxLat - minLat, 0.0001);

  const availableWidth = width - padding * 2;
  const availableHeight = height - padding * 2;
  const scaleX = availableWidth / boundsWidth;
  const scaleY = availableHeight / boundsHeight;
  const scale = Math.min(scaleX, scaleY);

  const drawWidth = boundsWidth * scale;
  const drawHeight = boundsHeight * scale;
  const offsetX = (width - drawWidth) / 2;
  const offsetY = (height - drawHeight) / 2;

  const project = ([lng, lat]) => {
    const x = offsetX + (lng - minLng) * scale;
    // SVG Y axis is inverted relative to latitude
    const y = offsetY + (maxLat - lat) * scale;
    return [x, y];
  };

  // Close the ring explicitly for the SVG path
  const closedRing =
    ring[ring.length - 1][0] === ring[0][0] && ring[ring.length - 1][1] === ring[0][1]
      ? ring
      : [...ring, ring[0]];

  const points = closedRing.map(project);
  const path = `M ${points.map((p) => p.join(' ')).join(' L ')} Z`;

  return {
    path,
    viewBox: `0 0 ${width} ${height}`,
    width,
    height,
    centroid: project([bounds.centerLng, bounds.centerLat]),
  };
}

export function formatArea(sqM) {
  if (sqM == null || !Number.isFinite(sqM)) return '—';
  const km2 = sqM / 1_000_000;
  if (km2 < 0.01) return `${sqM.toFixed(0)} m²`;
  if (km2 < 1) return `${(km2 * 100).toFixed(1)} ha`;
  if (km2 < 1000) return `${km2.toFixed(1)} km²`;
  return `${(km2 / 1000).toFixed(1)}k km²`;
}

export function formatLength(m) {
  if (m == null || !Number.isFinite(m)) return '—';
  if (m < 1000) return `${m.toFixed(0)} m`;
  return `${(m / 1000).toFixed(1)} km`;
}

export function countVertices(ring) {
  if (!ring || ring.length === 0) return 0;
  const first = ring[0];
  const last = ring[ring.length - 1];
  const closed = first[0] === last[0] && first[1] === last[1];
  return closed ? ring.length - 1 : ring.length;
}

export function ringArea(ring) {
  let area = 0;
  for (let i = 0; i < ring.length; i++) {
    const [x1, y1] = ring[i];
    const [x2, y2] = ring[(i + 1) % ring.length];
    area += x1 * y2 - x2 * y1;
  }
  return Math.abs(area) / 2;
}

function averageLatitude(ring) {
  if (!ring || ring.length === 0) return 0;
  let sum = 0;
  for (const [, lat] of ring) sum += lat;
  return sum / ring.length;
}

export function estimatePolygonAreaSqM(ring) {
  if (!Array.isArray(ring) || ring.length < 3) return null;
  const lat = averageLatitude(ring);
  const metersPerDegLat = 111132.92 - 559.82 * Math.cos(2 * lat * (Math.PI / 180)) + 1.175 * Math.cos(4 * lat * (Math.PI / 180));
  const metersPerDegLng = 111412.84 * Math.cos(lat * (Math.PI / 180)) - 93.5 * Math.cos(3 * lat * (Math.PI / 180));
  let area = 0;
  for (let i = 0; i < ring.length; i++) {
    const [x1, y1] = ring[i];
    const [x2, y2] = ring[(i + 1) % ring.length];
    area += (x1 * metersPerDegLng) * (y2 * metersPerDegLat) - (x2 * metersPerDegLng) * (y1 * metersPerDegLat);
  }
  return Math.abs(area) / 2;
}

export function estimatePolygonPerimeterM(ring) {
  if (!Array.isArray(ring) || ring.length < 2) return null;
  const lat = averageLatitude(ring);
  const metersPerDegLat = 111132.92 - 559.82 * Math.cos(2 * lat * (Math.PI / 180)) + 1.175 * Math.cos(4 * lat * (Math.PI / 180));
  const metersPerDegLng = 111412.84 * Math.cos(lat * (Math.PI / 180)) - 93.5 * Math.cos(3 * lat * (Math.PI / 180));
  let perimeter = 0;
  for (let i = 0; i < ring.length; i++) {
    const [x1, y1] = ring[i];
    const [x2, y2] = ring[(i + 1) % ring.length];
    const dx = (x2 - x1) * metersPerDegLng;
    const dy = (y2 - y1) * metersPerDegLat;
    perimeter += Math.sqrt(dx * dx + dy * dy);
  }
  return perimeter;
}

export function smallestZoneFeature(features) {
  if (!features || features.length === 0) return null;
  let smallest = features[0];
  let smallestArea = Infinity;
  features.forEach((feature) => {
    const ring = feature.geometry?.coordinates?.[0];
    if (!Array.isArray(ring)) return;
    const area = ringArea(ring);
    if (area < smallestArea) {
      smallestArea = area;
      smallest = feature;
    }
  });
  return smallest;
}

/**
 * Project a GeoJSON Polygon to screen pixels using a MapLibre map instance.
 * Returns an SVG path data string, or null if the geometry is invalid.
 */
export function buildZoneScreenPath(mapInstance, geometry) {
  if (!Array.isArray(geometry?.coordinates?.[0])) return null;
  const ring = geometry.coordinates[0];
  const points = ring.map((coord) => {
    const p = mapInstance.project(coord);
    return [p.x, p.y];
  });
  return `M ${points.map((p) => p.join(' ')).join(' L ')} Z`;
}
