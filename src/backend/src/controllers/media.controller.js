import { randomUUID } from 'crypto';
import { getStorageEngine } from '../storage/index.js';
import { processImage, isProcessableImage, isVideo } from '../utils/image-processor.js';
import * as mediaService from '../services/media.service.js';

const storage = getStorageEngine();

export async function uploadMedia(req, res) {
  if (!req.file) {
    return res.apiError('No file provided', 'VALIDATION_ERROR', 400);
  }

  const { id: incidentId } = req.params;
  const { originalname, mimetype, size, buffer } = req.file;
  const fileType = isProcessableImage(mimetype) ? 'image' : isVideo(mimetype) ? 'video' : 'other';

  if (fileType === 'other') {
    return res.apiError('Unsupported file type', 'VALIDATION_ERROR', 400);
  }

  const ext = fileType === 'image' ? 'webp' : mimetype.split('/')[1] || 'bin';
  const storedName = `${randomUUID()}.${ext}`;
  const folderPath = `incidents/${incidentId}`;
  const fullPath = `${folderPath}/${storedName}`;

  let fileUrl;
  let thumbnailUrl = null;
  let width = null;
  let height = null;
  let processedBuffer = buffer;

  if (fileType === 'image') {
    const processed = await processImage(buffer, mimetype);
    processedBuffer = processed.originalBuffer;
    width = processed.width;
    height = processed.height;

    // Upload main image
    fileUrl = await storage.upload(processedBuffer, fullPath, 'image/webp');

    // Upload thumbnail
    const thumbName = `${randomUUID()}_thumb.webp`;
    const thumbPath = `${folderPath}/${thumbName}`;
    thumbnailUrl = await storage.upload(processed.thumbnailBuffer, thumbPath, 'image/webp');
  } else {
    // Video: store as-is for now (Phase 9 adds compression)
    fileUrl = await storage.upload(buffer, fullPath, mimetype);
  }

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

  res.apiSuccess({ media: record }, 'File uploaded successfully');
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
  res.apiSuccess({ deleted: true });
}

export async function reorderMedia(req, res) {
  const { displayOrder } = req.body;
  const record = await mediaService.updateDisplayOrder(req.params.mediaId, displayOrder);
  res.apiSuccess({ media: record });
}
