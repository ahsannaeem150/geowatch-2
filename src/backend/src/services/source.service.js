import { query } from '../config/database.js';
import { fetchOembedHtml } from '../utils/oembed.js';

export async function createEventSource(eventId, { sourceType, sourceUrl, description, displayOrder }, createdBy) {
  let embedHtml = null;

  if (sourceType === 'x_post' && sourceUrl) {
    embedHtml = await fetchOembedHtml(sourceUrl);
  }

  const result = await query(
    `INSERT INTO event_sources (event_id, source_type, source_url, embed_html, description, display_order, created_by)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING id, source_type, source_url, embed_html, description, display_order, created_at`,
    [eventId, sourceType, sourceUrl || null, embedHtml, description || null, displayOrder || 0, createdBy]
  );

  return result.rows[0];
}
