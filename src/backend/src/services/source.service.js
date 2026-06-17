import { query } from '../config/database.js';
import { fetchOembedHtml } from '../utils/oembed.js';
import { ingestXPostSource } from './source-ingestion.service.js';

export async function createEventSource(
  incidentId,
  { updateId, sourceType, sourceUrl, description, displayOrder },
  createdBy
) {
  if (sourceType === 'x_post' && sourceUrl) {
    return ingestXPostSource(
      incidentId,
      { sourceUrl, description, displayOrder, updateId },
      createdBy
    );
  }

  let embedHtml = null;

  const result = await query(
    `INSERT INTO incident_sources (
       incident_id, update_id, source_type, source_url, embed_html, description,
       display_order, created_by
     )
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     RETURNING id, incident_id, update_id, source_type, source_url, embed_html, description,
               display_order, pinned, archived, archive_media_id,
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
    ]
  );

  return result.rows[0];
}

export async function updateSource(sourceId, { sourceUrl, description, displayOrder, updateId, archived, archiveMediaId, archiveReason }) {
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
               display_order, pinned, archived, archive_media_id,
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
            display_order, pinned, archived, archive_media_id,
            archive_reason, archived_at, last_checked_at, account_id,
            created_by, created_at
     FROM incident_sources
     WHERE id = $1`,
    [sourceId]
  );
  return result.rows[0] || null;
}

export async function listXPostSources(filters = {}) {
  const conditions = ["source_type = 'x_post'"];
  const values = [];
  let idx = 1;

  if (filters.accountId) {
    conditions.push(`account_id = $${idx++}`);
    values.push(filters.accountId);
  }
  if (filters.archived !== undefined && filters.archived !== '') {
    conditions.push(`archived = $${idx++}`);
    values.push(filters.archived === 'true' || filters.archived === true);
  }
  if (filters.archiveReason) {
    conditions.push(`archive_reason = $${idx++}`);
    values.push(filters.archiveReason);
  }

  const where = conditions.join(' AND ');

  const result = await query(
    `SELECT s.id, s.incident_id, s.update_id, s.source_url, s.embed_html, s.description,
            s.display_order, s.pinned, s.archived, s.archive_media_id,
            s.archive_reason, s.archived_at, s.last_checked_at, s.account_id,
            s.created_by, s.created_at,
            i.title AS incident_title,
            sa.username AS account_username,
            sa.display_name AS account_display_name,
            sa.is_suspended AS account_is_suspended,
            am.file_url AS archive_media_url,
            am.thumbnail_url AS archive_media_thumbnail_url
     FROM incident_sources s
     LEFT JOIN incidents i ON s.incident_id = i.id
     LEFT JOIN source_accounts sa ON s.account_id = sa.id
     LEFT JOIN incident_media am ON s.archive_media_id = am.id
     WHERE ${where}
     ORDER BY s.created_at DESC`,
    values
  );
  return result.rows;
}
