import { query } from '../config/database.js';
import { fetchXEmbedMetadata } from '../utils/x-oembed.js';
import { captureTweetScreenshot } from '../utils/x-screenshot.js';
import { getStorageEngine } from '../storage/index.js';
import { processImage } from '../utils/image-processor.js';
import { generateThumbFilename } from '../utils/slugify.js';
import { createMediaRecord } from './media.service.js';
import { findOrCreateAccount } from './source-account.service.js';
import { updateSource } from './source.service.js';

const storage = getStorageEngine();

function extractUsernameFromXUrl(url) {
  try {
    const pathname = new URL(url).pathname; // /username/status/...
    const parts = pathname.split('/').filter(Boolean);
    return parts[0] || null;
  } catch {
    return null;
  }
}

function buildProfileUrl(username) {
  return `https://x.com/${username}`;
}

async function attachScreenshot(sourceId, incidentId, updateId, sourceUrl, createdBy) {
  try {
    const screenshotBuffer = await captureTweetScreenshot(sourceUrl);
    if (!screenshotBuffer) return;

    const processed = await processImage(screenshotBuffer, 'image/png');
    const date = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const suffix = Math.random().toString(36).slice(2, 6);
    const storedName = `x-post-${date}-${suffix}.webp`;
    const folderPath = `incidents/${incidentId}`;
    const fullPath = `${folderPath}/${storedName}`;

    const fileUrl = await storage.upload(processed.originalBuffer, fullPath, 'image/webp');

    const baseName = storedName.replace(/\.webp$/, '');
    const thumbName = generateThumbFilename(baseName, 'webp');
    const thumbPath = `${folderPath}/${thumbName}`;
    const thumbnailUrl = await storage.upload(processed.thumbnailBuffer, thumbPath, 'image/webp');

    const media = await createMediaRecord({
      incidentId,
      updateId: updateId || null,
      originalName: storedName,
      storedName,
      fileType: 'image',
      mimeType: 'image/webp',
      fileSizeBytes: processed.originalBuffer.length,
      fileUrl,
      thumbnailUrl,
      width: processed.width,
      height: processed.height,
      uploadedBy: createdBy,
      caption: 'X post archive snapshot',
    });

    await updateSource(sourceId, { archiveMediaId: media.id });
  } catch (err) {
    console.error('[attachScreenshot] failed for source', sourceId, err.message);
  }
}

export async function ingestXPostSource(
  incidentId,
  { sourceUrl, description, displayOrder, updateId },
  createdBy
) {
  const metadata = await fetchXEmbedMetadata(sourceUrl);

  let accountId = null;
  let archived = false;
  let archiveReason = null;
  let embedHtml = null;

  if (metadata) {
    embedHtml = metadata.html;
    const username = extractUsernameFromXUrl(sourceUrl);
    const displayName = metadata.authorName || null;
    const profileUrl = metadata.authorUrl || (username ? buildProfileUrl(username) : null);

    if (username) {
      const account = await findOrCreateAccount({
        platform: 'x',
        username,
        displayName,
        profileUrl,
        avatarUrl: null,
      });
      accountId = account.id;
    }
  } else {
    archived = true;
    archiveReason = 'unavailable';

    // Keep a placeholder account link so future checks can group by account.
    const username = extractUsernameFromXUrl(sourceUrl);
    if (username) {
      const account = await findOrCreateAccount({
        platform: 'x',
        username,
        displayName: null,
        profileUrl: buildProfileUrl(username),
        avatarUrl: null,
      });
      accountId = account.id;
    }
  }

  const result = await query(
    `INSERT INTO incident_sources (
       incident_id, update_id, source_type, source_url, embed_html, description,
       display_order, created_by, account_id, archived, archive_reason, archived_at,
       archive_media_id, last_checked_at
     )
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
     RETURNING id, incident_id, update_id, source_type, source_url, embed_html, description,
               display_order, pinned, archived, archive_media_id,
               archive_reason, archived_at, created_by, created_at`,
    [
      incidentId,
      updateId || null,
      'x_post',
      sourceUrl,
      embedHtml,
      description || null,
      displayOrder || 0,
      createdBy,
      accountId,
      archived,
      archiveReason,
      archived ? new Date().toISOString() : null,
      null,
      new Date().toISOString(),
    ]
  );

  const source = result.rows[0];

  // Capture the screenshot asynchronously so the API response is not blocked.
  if (metadata) {
    attachScreenshot(source.id, incidentId, updateId, sourceUrl, createdBy);
  }

  return source;
}
