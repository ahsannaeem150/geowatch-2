export const HOT_BBOX = [26.3125, 5.7626, 104.1831, 41.5531];

export function getMaxZoomForCenter(lng, lat) {
  const [minLng, minLat, maxLng, maxLat] = HOT_BBOX;
  const inside = lng >= minLng && lng <= maxLng && lat >= minLat && lat <= maxLat;
  return inside ? 22 : 10;
}
