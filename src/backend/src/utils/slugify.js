/**
 * Sanitize a string into a URL-safe slug.
 *
 * Rules:
 *   - Lowercase everything
 *   - Replace spaces & underscores with hyphens
 *   - Strip all non-alphanumeric chars (except hyphens)
 *   - Collapse multiple hyphens into one
 *   - Trim hyphens from ends
 *   - Truncate to maxLength (default 40)
 *
 * @param {string} text
 * @param {number} maxLength
 * @returns {string}
 */
export function slugify(text, maxLength = 40) {
  if (!text || typeof text !== 'string') return '';

  return text
    .toLowerCase()
    .trim()
    .replace(/[\s_]+/g, '-')          // spaces / underscores → hyphen
    .replace(/[^a-z0-9\-]/g, '')      // remove non-alphanumeric (keep hyphens)
    .replace(/-+/g, '-')              // collapse multiple hyphens
    .replace(/^-+|-+$/g, '')          // trim leading/trailing hyphens
    .slice(0, maxLength)              // truncate
    .replace(/-+$/, '');              // ensure no trailing hyphen after truncate
}

/**
 * Generate a SEO-friendly filename for an uploaded media file.
 *
 * Pattern: {slug}-{YYYYMMDD}-{random-suffix}.{ext}
 *
 * @param {string} incidentTitle
 * @param {string} ext  — file extension without dot
 * @returns {string}
 */
export function generateMediaFilename(incidentTitle, ext) {
  const slug = slugify(incidentTitle, 40) || 'incident';
  const date = new Date().toISOString().slice(0, 10).replace(/-/g, ''); // YYYYMMDD
  const suffix = Math.random().toString(36).slice(2, 6); // 4-char random
  return `${slug}-${date}-${suffix}.${ext}`;
}

/**
 * Generate a thumbnail filename paired with a main media filename.
 *
 * @param {string} baseName  — the main file name (without extension)
 * @param {string} ext       — thumbnail extension
 * @returns {string}
 */
export function generateThumbFilename(baseName, ext = 'webp') {
  return `${baseName}_thumb.${ext}`;
}
