import { query } from '../config/database.js';
import { fetchOembedHtml } from '../utils/oembed.js';

export async function createTimelineUpdate(incidentId, { summary, updateDate, sourceUrl, type = 'update', verificationStatus = 'unverified' }, createdBy) {
  let embedHtml = null;
  if (sourceUrl) {
    embedHtml = await fetchOembedHtml(sourceUrl);
  }

  const result = await query(
    `INSERT INTO incident_updates (incident_id, summary, update_date, source_url, embed_html, created_by, type, verification_status)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     RETURNING id, summary, update_date, source_url, embed_html, type, verification_status, created_at`,
    [incidentId, summary, updateDate || new Date().toISOString(), sourceUrl || null, embedHtml, createdBy, type, verificationStatus]
  );
  return result.rows[0];
}

export async function updateTimelineEntry(updateId, { summary, updateDate, sourceUrl, type, verificationStatus }) {
  // If sourceUrl is explicitly provided (including empty string to clear), re-fetch embed
  let embedHtml = undefined;
  if (sourceUrl !== undefined) {
    embedHtml = sourceUrl ? await fetchOembedHtml(sourceUrl) : null;
  }

  const fields = [];
  const values = [];
  let idx = 1;

  if (summary !== undefined) {
    fields.push(`summary = $${idx++}`);
    values.push(summary);
  }
  if (updateDate !== undefined) {
    fields.push(`update_date = $${idx++}`);
    values.push(updateDate);
  }
  if (sourceUrl !== undefined) {
    fields.push(`source_url = $${idx++}`);
    values.push(sourceUrl || null);
  }
  if (embedHtml !== undefined) {
    fields.push(`embed_html = $${idx++}`);
    values.push(embedHtml);
  }
  if (type !== undefined) {
    fields.push(`type = $${idx++}`);
    values.push(type);
  }
  if (verificationStatus !== undefined) {
    fields.push(`verification_status = $${idx++}`);
    values.push(verificationStatus);
  }

  if (fields.length === 0) {
    throw new Error('No fields to update');
  }

  values.push(updateId);
  const result = await query(
    `UPDATE incident_updates SET ${fields.join(', ')} WHERE id = $${idx}
     RETURNING id, summary, update_date, source_url, embed_html, type, verification_status, created_at`,
    values
  );
  return result.rows[0] || null;
}

export async function deleteTimelineEntry(updateId) {
  const result = await query(
    'DELETE FROM incident_updates WHERE id = $1 RETURNING id',
    [updateId]
  );
  return result.rows[0] || null;
}

export async function setFeaturedItem(updateId, { sourceType, sourceId, mediaId }) {
  let featuredSourceType = sourceType;
  let featuredSourceId = null;
  let featuredMediaId = null;

  if (sourceType === 'media') {
    featuredMediaId = mediaId || null;
  } else {
    featuredSourceId = sourceId || null;
  }

  const result = await query(
    `UPDATE incident_updates
     SET featured_source_type = $2, featured_source_id = $3, featured_media_id = $4
     WHERE id = $1
     RETURNING id, featured_source_type, featured_source_id, featured_media_id`,
    [updateId, featuredSourceType, featuredSourceId, featuredMediaId]
  );
  return result.rows[0] || null;
}

export async function clearFeaturedItem(updateId) {
  const result = await query(
    `UPDATE incident_updates
     SET featured_source_type = NULL, featured_source_id = NULL, featured_media_id = NULL
     WHERE id = $1
     RETURNING id, featured_source_type, featured_source_id, featured_media_id`,
    [updateId]
  );
  return result.rows[0] || null;
}
