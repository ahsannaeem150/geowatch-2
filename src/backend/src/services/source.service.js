import { query } from '../config/database.js';
import { fetchOembedHtml } from '../utils/oembed.js';

export async function createEventSource(
  incidentId,
  { updateId, sourceType, sourceUrl, description, displayOrder, verificationStatus },
  createdBy
) {
  let embedHtml = null;

  if (sourceType === 'x_post' && sourceUrl) {
    embedHtml = await fetchOembedHtml(sourceUrl);
  }

  const result = await query(
    `INSERT INTO incident_sources (
       incident_id, update_id, source_type, source_url, embed_html, description,
       display_order, created_by, verification_status
     )
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
     RETURNING id, incident_id, update_id, source_type, source_url, embed_html, description,
               display_order, verification_status, pinned, archived, archive_media_id,
               archive_reason, archived_at, created_by, created_at`,
    [
      incidentId,
      updateId,
      sourceType,
      sourceUrl || null,
      embedHtml,
      description || null,
      displayOrder || 0,
      createdBy,
      verificationStatus || 'unverified',
    ]
  );

  return result.rows[0];
}

export async function updateSource(sourceId, { sourceUrl, description, displayOrder, verificationStatus, updateId, archived, archiveMediaId, archiveReason }) {
  // If sourceUrl is explicitly provided (including empty string to clear), re-fetch embed
  let embedHtml = undefined;
  if (sourceUrl !== undefined) {
    embedHtml = sourceUrl ? await fetchOembedHtml(sourceUrl) : null;
  }

  const fields = [];
  const values = [];
  let idx = 1;

  if (sourceUrl !== undefined) {
    fields.push(`source_url = $${idx++}`);
    values.push(sourceUrl || null);
  }
  if (embedHtml !== undefined) {
    fields.push(`embed_html = $${idx++}`);
    values.push(embedHtml);
  }
  if (description !== undefined) {
    fields.push(`description = $${idx++}`);
    values.push(description || null);
  }
  if (displayOrder !== undefined) {
    fields.push(`display_order = $${idx++}`);
    values.push(displayOrder);
  }
  if (verificationStatus !== undefined) {
    fields.push(`verification_status = $${idx++}`);
    values.push(verificationStatus);
  }
  if (updateId !== undefined) {
    fields.push(`update_id = $${idx++}`);
    values.push(updateId);
  }
  if (archived !== undefined) {
    fields.push(`archived = $${idx++}`);
    values.push(archived);
  }
  if (archiveMediaId !== undefined) {
    fields.push(`archive_media_id = $${idx++}`);
    values.push(archiveMediaId || null);
  }
  if (archiveReason !== undefined) {
    fields.push(`archive_reason = $${idx++}`);
    values.push(archiveReason || null);
  }

  if (archived === true) {
    fields.push(`archived_at = $${idx++}`);
    values.push(new Date().toISOString());
  } else if (archived === false) {
    fields.push(`archived_at = NULL`);
  }

  if (fields.length === 0) {
    throw new Error('No fields to update');
  }

  values.push(sourceId);
  const result = await query(
    `UPDATE incident_sources SET ${fields.join(', ')} WHERE id = $${idx}
     RETURNING id, incident_id, update_id, source_type, source_url, embed_html, description,
               display_order, verification_status, pinned, archived, archive_media_id,
               archive_reason, archived_at, created_by, created_at`,
    values
  );
  return result.rows[0] || null;
}

export async function deleteSource(sourceId) {
  const result = await query(
    'DELETE FROM incident_sources WHERE id = $1 RETURNING id, incident_id, update_id, source_type',
    [sourceId]
  );
  return result.rows[0] || null;
}

export async function updateSourceVerification(sourceId, verificationStatus) {
  return updateSource(sourceId, { verificationStatus });
}

export async function pinSource(sourceId, pinned) {
  const result = await query(
    `UPDATE incident_sources
     SET pinned = $2
     WHERE id = $1
     RETURNING id, pinned`,
    [sourceId, pinned]
  );
  return result.rows[0] || null;
}

export async function getSourceById(sourceId) {
  const result = await query(
    `SELECT id, incident_id, update_id, source_type, source_url, embed_html, description,
            display_order, verification_status, pinned, archived, archive_media_id,
            archive_reason, archived_at, created_by, created_at
     FROM incident_sources
     WHERE id = $1`,
    [sourceId]
  );
  return result.rows[0] || null;
}
