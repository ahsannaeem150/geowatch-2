import { query } from '../config/database.js';

export async function listMediaByIncident(incidentId) {
  const result = await query(
    `SELECT id, original_name, file_type, mime_type, file_size_bytes,
            file_url, thumbnail_url, width, height, display_order, created_at
     FROM incident_media
     WHERE incident_id = $1
     ORDER BY display_order ASC, created_at DESC`,
    [incidentId]
  );
  return result.rows;
}

export async function createMediaRecord(data) {
  const result = await query(
    `INSERT INTO incident_media
       (incident_id, original_name, stored_name, file_type, mime_type,
        file_size_bytes, file_url, thumbnail_url, width, height, uploaded_by)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
     RETURNING *`,
    [
      data.incidentId,
      data.originalName,
      data.storedName,
      data.fileType,
      data.mimeType,
      data.fileSizeBytes,
      data.fileUrl,
      data.thumbnailUrl,
      data.width,
      data.height,
      data.uploadedBy,
    ]
  );
  return result.rows[0];
}

export async function deleteMediaRecord(id) {
  const result = await query(
    'DELETE FROM incident_media WHERE id = $1 RETURNING *',
    [id]
  );
  return result.rows[0];
}

export async function getMediaById(id) {
  const result = await query(
    'SELECT * FROM incident_media WHERE id = $1',
    [id]
  );
  return result.rows[0];
}

export async function updateDisplayOrder(id, displayOrder) {
  const result = await query(
    'UPDATE incident_media SET display_order = $1, updated_at = NOW() WHERE id = $2 RETURNING *',
    [displayOrder, id]
  );
  return result.rows[0];
}
