import { getXArchiveDebug, setAccountSuspended, getSourceById } from '../services/x-archive-debug.service.js';
import { checkXPostAvailability } from '../services/x-availability.service.js';
import { captureTweetScreenshot } from '../utils/x-screenshot.js';
import { processImage } from '../utils/image-processor.js';
import { getStorageEngine } from '../storage/index.js';
import { createMediaRecord } from '../services/media.service.js';
import { updateSource } from '../services/source.service.js';
import { generateThumbFilename } from '../utils/slugify.js';

const storage = getStorageEngine();

export async function getXArchiveDebugController(req, res) {
  const filters = {
    accountId: req.query.accountId || null,
    archived: req.query.archived,
    archiveReason: req.query.archiveReason || null,
  };
  const data = await getXArchiveDebug(filters);
  res.apiSuccess(data);
}

export async function setAccountSuspendedController(req, res) {
  const { accountId } = req.params;
  const { isSuspended } = req.body;

  if (typeof isSuspended !== 'boolean') {
    return res.apiError('isSuspended boolean is required', 'VALIDATION_ERROR', 400);
  }

  await setAccountSuspended(accountId, isSuspended);
  res.apiSuccess({ accountId, isSuspended }, 'Account suspension status updated');
}

export async function checkXArchiveSourceController(req, res) {
  const { sourceId } = req.params;
  const source = await getSourceById(sourceId);

  if (!source) {
    return res.apiError('Source not found', 'NOT_FOUND', 404);
  }
  if (source.source_type !== 'x_post' || !source.source_url) {
    return res.apiError('Only X post sources can be checked', 'VALIDATION_ERROR', 400);
  }

  const result = await checkXPostAvailability(source.id, source.source_url, source.account_id);
  const refreshed = await getSourceById(sourceId);

  res.apiSuccess({ source: refreshed, ...result });
}

export async function snapshotXArchiveSourceController(req, res) {
  const { sourceId } = req.params;
  const source = await getSourceById(sourceId);

  if (!source) {
    return res.apiError('Source not found', 'NOT_FOUND', 404);
  }
  if (source.source_type !== 'x_post' || !source.source_url) {
    return res.apiError('Only X post sources can be snapshotted', 'VALIDATION_ERROR', 400);
  }

  const screenshotBuffer = await captureTweetScreenshot(source.source_url);
  if (!screenshotBuffer) {
    return res.apiError(
      'Could not capture screenshot — the tweet may be deleted, the account suspended, or X widget rendering failed.',
      'CAPTURE_FAILED',
      422
    );
  }

  try {
    const processed = await processImage(screenshotBuffer, 'image/png');
    const date = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const suffix = Math.random().toString(36).slice(2, 6);
    const storedName = `x-post-${date}-${suffix}.webp`;
    const folderPath = `incidents/${source.incident_id}`;
    const fullPath = `${folderPath}/${storedName}`;

    const fileUrl = await storage.upload(processed.originalBuffer, fullPath, 'image/webp');

    const baseName = storedName.replace(/\.webp$/, '');
    const thumbName = generateThumbFilename(baseName, 'webp');
    const thumbPath = `${folderPath}/${thumbName}`;
    const thumbnailUrl = await storage.upload(processed.thumbnailBuffer, thumbPath, 'image/webp');

    const media = await createMediaRecord({
      incidentId: source.incident_id,
      updateId: source.update_id,
      originalName: storedName,
      storedName,
      fileType: 'image',
      mimeType: 'image/webp',
      fileSizeBytes: processed.originalBuffer.length,
      fileUrl,
      thumbnailUrl,
      width: processed.width,
      height: processed.height,
      uploadedBy: req.user.id,
      caption: 'X post archive snapshot',
    });

    const updatedSource = await updateSource(source.id, { archiveMediaId: media.id });

    res.apiSuccess({ source: updatedSource, media }, 'Screenshot captured and attached');
  } catch (err) {
    console.error('[snapshotXArchiveSourceController]', err);
    res.apiError('Screenshot processing or storage failed', 'SERVER_ERROR', 500);
  }
}

export async function archiveXArchiveSourceController(req, res) {
  const { sourceId } = req.params;
  const { archived, archiveReason, archiveMediaId } = req.body;

  if (typeof archived !== 'boolean') {
    return res.apiError('archived boolean is required', 'VALIDATION_ERROR', 400);
  }

  const source = await getSourceById(sourceId);
  if (!source) {
    return res.apiError('Source not found', 'NOT_FOUND', 404);
  }
  if (source.source_type !== 'x_post') {
    return res.apiError('Only X post sources can be archived here', 'VALIDATION_ERROR', 400);
  }

  const updatePayload = {
    archived,
    archiveReason: archived ? archiveReason || null : null,
  };
  // Only overwrite the snapshot when a new one is explicitly provided. Archiving without
  // a snapshot keeps the existing one; unarchiving also keeps it.
  if (archived && archiveMediaId !== undefined) {
    updatePayload.archiveMediaId = archiveMediaId || null;
  }

  const updated = await updateSource(source.id, updatePayload);

  res.apiSuccess({ source: updated }, archived ? 'Source archived' : 'Source unarchived');
}
