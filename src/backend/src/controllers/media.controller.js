import { randomUUID } from 'crypto';
import { getStorageEngine } from '../storage/index.js';
import { processImage, isProcessableImage, isVideo } from '../utils/image-processor.js';
import { processVideo } from '../utils/video-processor.js';
import { generateMediaFilename, generateThumbFilename } from '../utils/slugify.js';
import { getIncidentTitle } from '../services/incident.service.js';
import * as mediaService from '../services/media.service.js';
import { auditLog } from '../utils/audit-log.js';
import { AUDIT_ACTIONS } from '../utils/audit-actions.js';

const storage = getStorageEngine();

export async function uploadMedia(req, res) {
  console.log('[MediaUpload] Request received — incidentId:', req.params.id, 'file:', req.file?.originalname, 'mimetype:', req.file?.mimetype, 'size:', req.file?.size);
  if (!req.file) {
    console.log('[MediaUpload] Rejected: no file provided');
    return res.apiError('No file provided', 'VALIDATION_ERROR', 400);
  }

  const { id: incidentId } = req.params;
  const { originalname, mimetype, size, buffer } = req.file;
  const fileType = isProcessableImage(mimetype) ? 'image' : isVideo(mimetype) ? 'video' : 'other';

  if (fileType === 'other') {
    console.log('[MediaUpload] Rejected: unsupported file type', mimetype);
    return res.apiError('Unsupported file type', 'VALIDATION_ERROR', 400);
  }

  // Build SEO-friendly filename from incident title
  const incidentTitle = await getIncidentTitle(incidentId);
  const ext = fileType === 'image' ? 'webp' : mimetype.split('/')[1] || 'bin';
  const storedName = generateMediaFilename(incidentTitle || incidentId, ext);
  const folderPath = `incidents/${incidentId}`;
  const fullPath = `${folderPath}/${storedName}`;

  let fileUrl;
  let thumbnailUrl = null;
  let width = null;
  let height = null;
  let processedBuffer = buffer;

  try {
    if (fileType === 'image') {
      console.log('[MediaUpload] Processing image...');
      const processed = await processImage(buffer, mimetype);
      processedBuffer = processed.originalBuffer;
      width = processed.width;
      height = processed.height;
      console.log('[MediaUpload] Image processed — dimensions:', width, 'x', height, 'buffer size:', processedBuffer.length);

      // Upload main image
      fileUrl = await storage.upload(processedBuffer, fullPath, 'image/webp');
      console.log('[MediaUpload] Main image stored at:', fileUrl);

      // Upload thumbnail with paired name
      const baseName = storedName.replace(/\.webp$/, '');
      const thumbName = generateThumbFilename(baseName, 'webp');
      const thumbPath = `${folderPath}/${thumbName}`;
      thumbnailUrl = await storage.upload(processed.thumbnailBuffer, thumbPath, 'image/webp');
      console.log('[MediaUpload] Thumbnail stored at:', thumbnailUrl);
    } else if (fileType === 'video') {
      console.log('[MediaUpload] Processing video...');
      const processed = await processVideo(buffer, mimetype);
      processedBuffer = processed.processedBuffer;
      fileUrl = await storage.upload(processedBuffer, fullPath, mimetype);
      console.log('[MediaUpload] Video stored at:', fileUrl);
      // Future: thumbnailUrl = processed.posterBuffer ? await storage.upload(...) : null;
    }

    console.log('[MediaUpload] Creating DB record...');
    const record = await mediaService.createMediaRecord({
      incidentId,
      originalName: originalname,
      storedName,
      fileType,
      mimeType: fileType === 'image' ? 'image/webp' : mimetype,
      fileSizeBytes: processedBuffer.length,
      fileUrl,
      thumbnailUrl,
      width,
      height,
      uploadedBy: req.user.id,
    });
    console.log('[MediaUpload] DB record created — id:', record.id);

    await auditLog(req, AUDIT_ACTIONS.MEDIA_UPLOADED, 'media', record.id, {
      incidentId,
      fileType,
      originalName: originalname,
    });

    res.apiSuccess({ media: record }, 'File uploaded successfully');
  } catch (err) {
    console.error('[MediaUpload] Processing error:', err.message, err.stack);
    throw err;
  }
}

export async function listMedia(req, res) {
  const media = await mediaService.listMediaByIncident(req.params.id);
  res.apiSuccess({ media });
}

export async function deleteMedia(req, res) {
  const record = await mediaService.getMediaById(req.params.mediaId);
  if (!record) {
    return res.apiError('Media not found', 'NOT_FOUND', 404);
  }

  // Extract relative path from URL and delete from storage
  // For local: URL is http://localhost:3000/uploads/incidents/{id}/{name}
  // We need to convert back to relative path: incidents/{id}/{name}
  const urlPath = new URL(record.file_url).pathname;
  const relativePath = urlPath.replace('/uploads/', '');
  await storage.delete(relativePath);

  if (record.thumbnail_url) {
    const thumbPath = new URL(record.thumbnail_url).pathname.replace('/uploads/', '');
    await storage.delete(thumbPath);
  }

  await mediaService.deleteMediaRecord(req.params.mediaId);

  await auditLog(req, AUDIT_ACTIONS.MEDIA_DELETED, 'media', req.params.mediaId, {
    incidentId: record.incident_id,
    fileType: record.file_type,
    originalName: record.original_name,
  });

  res.apiSuccess({ deleted: true });
}

export async function reorderMedia(req, res) {
  const { displayOrder } = req.body;
  const record = await mediaService.updateDisplayOrder(req.params.mediaId, displayOrder);
  res.apiSuccess({ media: record });
}
