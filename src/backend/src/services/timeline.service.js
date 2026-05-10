import { query } from '../config/database.js';
import { fetchOembedHtml } from '../utils/oembed.js';

export async function createTimelineUpdate(incidentId, { summary, updateDate, sourceUrl }, createdBy) {
  let embedHtml = null;
  if (sourceUrl) {
    embedHtml = await fetchOembedHtml(sourceUrl);
  }

  const result = await query(
    `INSERT INTO incident_updates (incident_id, summary, update_date, source_url, embed_html, created_by)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING id, summary, update_date, source_url, embed_html, created_at`,
    [incidentId, summary, updateDate || new Date().toISOString(), sourceUrl || null, embedHtml, createdBy]
  );
  return result.rows[0];
}

export async function updateTimelineEntry(updateId, { summary, updateDate, sourceUrl }) {
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

  if (fields.length === 0) {
    throw new Error('No fields to update');
  }

  values.push(updateId);
  const result = await query(
    `UPDATE incident_updates SET ${fields.join(', ')} WHERE id = $${idx}
     RETURNING id, summary, update_date, source_url, embed_html, created_at`,
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
