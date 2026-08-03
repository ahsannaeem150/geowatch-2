const BASE_URL = process.env.API_URL || 'http://localhost:3100';

/**
 * incident_media rows store absolute upload URLs built with the API origin
 * AT UPLOAD TIME (storage/local.storage.js). Rows written before the
 * 3000 → 3100 port move now point at a dead origin, so every image renders
 * blank even though the files serve fine on the current port.
 *
 * The path under /uploads/ is the durable identifier — rebuild the URL on
 * the current configured origin at read time. This heals legacy rows for
 * all clients without a data migration and makes any future port/origin
 * move a non-event. Non-upload URLs (external hosts) pass through.
 */
export function normalizeMediaUrl(url) {
  if (!url || typeof url !== 'string') return url;
  const idx = url.indexOf('/uploads/');
  if (idx === -1) return url;
  return `${BASE_URL}${url.slice(idx)}`;
}
