// Server-side proxy for the Nominatim geocoding API. Frontend apps must call
// this service instead of Nominatim directly so the User-Agent is controlled
// and results are cached (Nominatim's usage policy requires both).

const NOMINATIM_URL = process.env.NOMINATIM_URL || 'https://nominatim.openstreetmap.org/search';
const USER_AGENT = 'IntelMap24/1.0 (https://intelmap24.com)';

const CACHE_TTL_MS = 10 * 60 * 1000;
const CACHE_MAX_ENTRIES = 500;
const cache = new Map();

function cacheKey(q) {
  return q.trim().toLowerCase();
}

function getCached(key) {
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.at > CACHE_TTL_MS) {
    cache.delete(key);
    return null;
  }
  return entry.data;
}

function setCached(key, data) {
  if (cache.size >= CACHE_MAX_ENTRIES) {
    // Map keys are insertion-ordered — evict the oldest entry.
    cache.delete(cache.keys().next().value);
  }
  cache.set(key, { at: Date.now(), data });
}

export async function searchGeocode(q) {
  const key = cacheKey(q);
  const cached = getCached(key);
  if (cached) return cached;

  const url = `${NOMINATIM_URL}?format=json&q=${encodeURIComponent(q.trim())}&limit=6&addressdetails=1`;
  let res;
  try {
    res = await fetch(url, {
      signal: AbortSignal.timeout(5000),
      headers: {
        'User-Agent': USER_AGENT,
        'Accept-Language': 'en',
      },
    });
  } catch (err) {
    console.error('[Geocode] Nominatim request failed:', err.message, url);
    throw Object.assign(new Error('Location search unavailable'), {
      status: 502,
      errorCode: 'GEOCODE_UNAVAILABLE',
    });
  }

  if (!res.ok) {
    console.error('[Geocode] Nominatim responded with status', res.status, url);
    throw Object.assign(new Error('Location search unavailable'), {
      status: 502,
      errorCode: 'GEOCODE_UNAVAILABLE',
    });
  }

  const body = await res.json();
  const data = Array.isArray(body) ? body : [];
  setCached(key, data);
  return data;
}
