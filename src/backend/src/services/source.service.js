import { query } from '../config/database.js';
import { fetchOembedHtml } from '../utils/oembed.js';

export async function createEventSource(incidentId, { sourceType, sourceUrl, description, displayOrder, verificationStatus }, createdBy) {
  let embedHtml = null;

  if (sourceType === 'x_post' && sourceUrl) {
    embedHtml = await fetchOembedHtml(sourceUrl);
  }

  const result = await query(
    `INSERT INTO incident_sources (incident_id, source_type, source_url, embed_html, description, display_order, created_by, verification_status)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     RETURNING id, source_type, source_url, embed_html, description, display_order, verification_status, created_at`,
    [incidentId, sourceType, sourceUrl || null, embedHtml, description || null, displayOrder || 0, createdBy, verificationStatus || 'unverified']
  );

  return result.rows[0];
}

export async function updateSourceVerification(sourceId, verificationStatus) {
  const result = await query(
    `UPDATE incident_sources
     SET verification_status = $2
     WHERE id = $1
     RETURNING id, source_type, source_url, embed_html, description, display_order, verification_status, created_at`,
    [sourceId, verificationStatus]
  );
  return result.rows[0] || null;
}
