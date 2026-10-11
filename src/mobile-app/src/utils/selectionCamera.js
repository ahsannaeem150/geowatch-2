/**
 * IntelMap24 mobile — smart selection camera policy.
 *
 * Decision logic is a VERBATIM port of the web shared policy
 * (src/shared/utils/selectionCamera.js) — same constants, same rules, so a
 * selection behaves identically on web and mobile. What differs is the
 * measurement layer: the web asks the MapLibre instance (cameraForBounds /
 * project) while MapLibre RN exposes no synchronous cameraForBounds, so the
 * same Web-Mercator math is done in pure functions at the bottom of this file
 * (fitZoomForBounds / projectToScreen / centerForPaddedFlight).
 *
 * Sources: 'map' (marker click), 'power-search', 'deep-link'; anything else
 * ('drawer', 'search', 'notification', 'recent', 'toast', …) is treated as 'list'.
 */

// ─── Incident (point) zoom levels ───
/** Below this zoom, a map click zooms in to INCIDENT_MAP_CLICK_TARGET_ZOOM. */
export const INCIDENT_MAP_CLICK_MIN_ZOOM = 5.5;
/** Target zoom for a map click made below INCIDENT_MAP_CLICK_MIN_ZOOM. */
export const INCIDENT_MAP_CLICK_TARGET_ZOOM = 6.0;
/** Floor for list selections — never zooms out, only up to this level. */
export const INCIDENT_LIST_MIN_ZOOM = 6;
/** Floor for power-search selections. */
export const INCIDENT_POWER_SEARCH_ZOOM = 6;
/** Fixed zoom for deep-links (explicit navigation intent). */
export const DEEP_LINK_ZOOM = 7;

// ─── Durations (ms) — all incident flights share the original smooth 800ms feel ───
export const DURATION_INCIDENT_MAP_CLICK = 800;
export const DURATION_INCIDENT_LIST = 800;
export const DURATION_POWER_SEARCH_VISIBLE_PAN = 800;
export const DURATION_POWER_SEARCH_OFFSCREEN = 800;
export const DURATION_DEEP_LINK = 800;
/** Pan-only duration when auto-zoom is disabled (legacy behavior). */
export const DURATION_PAN_ONLY = 800;
/** Zone flight duration (comfort-fit). */
export const DURATION_ZONE_FIT = 1000;
/** Short pan to the zone centroid when the fit flight is skipped. */
export const DURATION_ZONE_CENTROID_PAN = 800;

// ─── Zone (polygon) fitting ───
/** Fraction of the padded visible viewport the zone bbox should fill (0.55 = 55%). */
export const ZONE_COMFORT_FACTOR = 0.55;
/** Never zoom out past this when comfort-fitting a zone. */
export const ZONE_MIN_ZOOM = 2.5;
/**
 * Max zoom caps by zone size — the bbox diagonal (haversine of the two bbox
 * corners) picks the cap so tiny zones don't dive to street level:
 *   < 2 km → 11, 2–15 km → 12, larger → 14.
 */
export const ZONE_SIZE_CAPS = [
  { maxDiagonalKm: 2, cap: 11 },
  { maxDiagonalKm: 15, cap: 12 },
  { maxDiagonalKm: Infinity, cap: 14 },
];
/**
 * If |currentZoom − target| is within this tolerance AND the bbox already fits
 * at currentZoom, the comfort-fit flight is skipped (pan to centroid instead).
 */
export const ZONE_FIT_TOLERANCE = 0.75;

const EARTH_RADIUS_KM = 6371;

function toRad(deg) {
  return (deg * Math.PI) / 180;
}

/**
 * Great-circle distance in km between two [lng, lat] points (haversine).
 */
export function haversineKm([lng1, lat1], [lng2, lat2]) {
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.sqrt(a));
}

/**
 * Normalize a bbox to [[minLng, minLat], [maxLng, maxLat]].
 * Accepts the flat [minLng, minLat, maxLng, maxLat] form too.
 */
export function normalizeBounds(bounds) {
  if (!bounds) return null;
  if (Array.isArray(bounds) && bounds.length === 4 && bounds.every(Number.isFinite)) {
    return [[bounds[0], bounds[1]], [bounds[2], bounds[3]]];
  }
  if (Array.isArray(bounds) && bounds.length === 2 && Array.isArray(bounds[0]) && Array.isArray(bounds[1])) {
    return bounds;
  }
  return null;
}

/**
 * Max zoom cap for a zone based on its bbox diagonal length.
 */
export function zoneSizeCap(bounds) {
  const b = normalizeBounds(bounds);
  if (!b) return ZONE_SIZE_CAPS[ZONE_SIZE_CAPS.length - 1].cap;
  const diagonalKm = haversineKm(b[0], b[1]);
  for (const { maxDiagonalKm, cap } of ZONE_SIZE_CAPS) {
    if (diagonalKm < maxDiagonalKm) return cap;
  }
  return ZONE_SIZE_CAPS[ZONE_SIZE_CAPS.length - 1].cap;
}

/**
 * Trans-regional zones (bbox diagonal ≥ ZONE_LARGE_DIAGONAL_KM) fill a larger
 * share of the viewport so they don't sit slightly too zoomed-out. Everything
 * smaller keeps ZONE_COMFORT_FACTOR exactly — small zones are verified good.
 */
export const ZONE_LARGE_DIAGONAL_KM = 2000;
export const ZONE_COMFORT_FACTOR_LARGE = 0.7;

/**
 * Comfort factor by zone size. Huge zones → ZONE_COMFORT_FACTOR_LARGE,
 * everything else → ZONE_COMFORT_FACTOR.
 */
export function zoneComfortFactor(bounds) {
  const b = normalizeBounds(bounds);
  if (!b) return ZONE_COMFORT_FACTOR;
  return haversineKm(b[0], b[1]) >= ZONE_LARGE_DIAGONAL_KM
    ? ZONE_COMFORT_FACTOR_LARGE
    : ZONE_COMFORT_FACTOR;
}

/**
 * Stable signature for the repeat-click guard: identical (type, source, lng, lat)
 * selections in a row are ignored entirely (no re-flight).
 */
export function selectionSignature({ type, source, lng, lat }) {
  return `${type}|${source}|${Number(lng).toFixed(6)}|${Number(lat).toFixed(6)}`;
}

/**
 * Decide the camera response for a selection.
 *
 * @param {object} request
 * @param {'incident'|'zone'} request.type
 * @param {string} request.source  'map' | 'power-search' | 'deep-link' | anything else = 'list'
 * @param {Array} [request.bounds] zone bbox (flat or nested), zones only
 * @param {number} request.currentZoom
 * @param {boolean} [request.isVisibleInViewport]  target point inside padded viewport (power-search pan rule)
 * @param {boolean} [request.fitsAtCurrentZoom]    zone bbox already fits at currentZoom (tolerance rule)
 * @param {boolean} [request.autoZoomEnabled=true]
 * @param {number} [request.fitZoom]  comfort-fit zoom precomputed via fitZoomForBounds (zones)
 * @returns {{ zoom: number, duration: number, panOnly: boolean, skip: boolean }}
 *   zoom     target zoom (caller still clamps to its maxZoom)
 *   duration flight duration in ms
 *   panOnly  true → keep currentZoom, just pan to the target center
 *   skip     true → the comfort-fit flight was skipped by the zone tolerance
 *            rule; only a short pan to the centroid should run
 */
export function getSelectionCamera({
  type,
  source,
  bounds,
  currentZoom,
  isVisibleInViewport = false,
  fitsAtCurrentZoom = false,
  autoZoomEnabled = true,
  fitZoom,
}) {
  const isDeepLink = source === 'deep-link';

  // Auto-zoom disabled: pan to the feature but preserve the user's zoom.
  // Deep-links are the exception — opening a shared URL is explicit intent.
  if (!autoZoomEnabled && !isDeepLink) {
    return { zoom: currentZoom, duration: DURATION_PAN_ONLY, panOnly: true, skip: false };
  }

  if (type === 'incident') {
    if (isDeepLink) {
      return { zoom: DEEP_LINK_ZOOM, duration: DURATION_DEEP_LINK, panOnly: false, skip: false };
    }
    if (source === 'map') {
      // Map click: gentle floor, never a forced jump when already zoomed in.
      const zoom = currentZoom < INCIDENT_MAP_CLICK_MIN_ZOOM ? INCIDENT_MAP_CLICK_TARGET_ZOOM : currentZoom;
      return { zoom, duration: DURATION_INCIDENT_MAP_CLICK, panOnly: false, skip: false };
    }
    if (source === 'power-search') {
      // Floor first.
      if (currentZoom < INCIDENT_POWER_SEARCH_ZOOM) {
        return { zoom: INCIDENT_POWER_SEARCH_ZOOM, duration: DURATION_POWER_SEARCH_OFFSCREEN, panOnly: false, skip: false };
      }
      // Already at a good zoom: pan only. Shorter pan when the target is on-screen.
      return {
        zoom: currentZoom,
        duration: isVisibleInViewport ? DURATION_POWER_SEARCH_VISIBLE_PAN : DURATION_POWER_SEARCH_OFFSCREEN,
        panOnly: true,
        skip: false,
      };
    }
    // 'list' — drawers, palette, notifications, recents, toasts, etc.
    // Floor at INCIDENT_LIST_MIN_ZOOM but never zoom out.
    return {
      zoom: Math.max(currentZoom, INCIDENT_LIST_MIN_ZOOM),
      duration: DURATION_INCIDENT_LIST,
      panOnly: false,
      skip: false,
    };
  }

  if (type === 'zone') {
    // No usable bounds: fall back to a plain pan at current zoom.
    if (!bounds || !Number.isFinite(fitZoom)) {
      return { zoom: currentZoom, duration: DURATION_ZONE_CENTROID_PAN, panOnly: true, skip: false };
    }
    const cap = zoneSizeCap(bounds);
    const target = Math.max(ZONE_MIN_ZOOM, Math.min(cap, fitZoom));
    // Tolerance: close enough to the target and the bbox already fits → skip the
    // flight, only pan to the centroid. Deep-links always comfort-fit.
    if (!isDeepLink && Math.abs(currentZoom - target) <= ZONE_FIT_TOLERANCE && fitsAtCurrentZoom) {
      return { zoom: currentZoom, duration: DURATION_ZONE_CENTROID_PAN, panOnly: true, skip: true };
    }
    return { zoom: target, duration: DURATION_ZONE_FIT, panOnly: false, skip: false };
  }

  // Unknown type (e.g. location search): preserve zoom, just pan.
  return { zoom: currentZoom, duration: DURATION_PAN_ONLY, panOnly: true, skip: false };
}

// ─── Mobile measurement layer (pure Web-Mercator, no map instance) ───
// TILE_PX matches MapLibre's 512px world width at zoom 0.
const TILE_PX = 512;

export function mercX(lng) {
  return (lng + 180) / 360;
}

export function mercY(lat) {
  const clamped = Math.max(-85.051129, Math.min(85.051129, lat));
  const s = Math.sin((clamped * Math.PI) / 180);
  return 0.5 - Math.log((1 + s) / (1 - s)) / (4 * Math.PI);
}

export function unMercX(x) {
  return x * 360 - 180;
}

export function unMercY(y) {
  return (Math.atan(Math.sinh(Math.PI * (1 - 2 * y))) * 180) / Math.PI;
}

/**
 * Zoom at which `bounds` fills `comfortFactor` of the padded viewport —
 * the pure-math equivalent of the web's cameraForBounds(fittedPadding).
 */
export function fitZoomForBounds(bounds, viewportW, viewportH, padding = {}, comfortFactor = 1.0) {
  const b = normalizeBounds(bounds);
  if (!b) return null;
  const dx = Math.max(1e-9, Math.abs(mercX(b[1][0]) - mercX(b[0][0])) * TILE_PX);
  const dy = Math.max(1e-9, Math.abs(mercY(b[1][1]) - mercY(b[0][1])) * TILE_PX);
  const availW = Math.max(1, viewportW - (padding.left || 0) - (padding.right || 0)) * comfortFactor;
  const availH = Math.max(1, viewportH - (padding.top || 0) - (padding.bottom || 0)) * comfortFactor;
  return Math.log2(Math.min(availW / dx, availH / dy));
}

/**
 * Project [lng, lat] to screen pixels for the given camera — the equivalent
 * of the web's map.project against the padded rect (power-search pan rule).
 */
export function projectToScreen([lng, lat], zoom, center, viewportW, viewportH) {
  const world = TILE_PX * 2 ** zoom;
  const cx = mercX(center[0]) * world;
  const cy = mercY(center[1]) * world;
  return [mercX(lng) * world - cx + viewportW / 2, mercY(lat) * world - cy + viewportH / 2];
}

/**
 * The RN Camera's easeTo/flyTo take no padding option — shift the flight
 * center so the target lands at the padded rect's center instead of the raw
 * screen center (what the web gets from MapLibre's camera padding).
 */
export function centerForPaddedFlight([lng, lat], zoom, padding = {}) {
  const world = TILE_PX * 2 ** zoom;
  const ox = ((padding.left || 0) - (padding.right || 0)) / 2;
  const oy = ((padding.top || 0) - (padding.bottom || 0)) / 2;
  return [
    unMercX((mercX(lng) * world - ox) / world),
    unMercY((mercY(lat) * world - oy) / world),
  ];
}
