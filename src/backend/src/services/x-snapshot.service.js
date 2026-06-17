import { chromium } from 'playwright';
import { getStorageEngine } from '../storage/index.js';
import { processImage } from '../utils/image-processor.js';
import { generateMediaFilename, generateThumbFilename } from '../utils/slugify.js';
import { getIncidentTitle } from './incident.service.js';
import { createMediaRecord } from './media.service.js';
import { query } from '../config/database.js';

const storage = getStorageEngine();

function buildEmbedHtml(tweetUrl) {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>body{margin:0;background:#000}</style>
</head>
<body>
  <blockquote class="twitter-tweet" data-theme="dark" data-align="center">
    <a href="${tweetUrl}"></a>
  </blockquote>
  <script async src="https://platform.twitter.com/widgets.js" charset="utf-8"></script>
</body>
</html>`;
}

async function updateSourceSnapshot(sourceId, mediaId) {
  await query(
    `UPDATE incident_sources
     SET archive_media_id = $1,
         archived = false,
         archive_reason = NULL,
         archived_at = NULL,
         last_checked_at = NOW(),
         updated_at = NOW()
     WHERE id = $2`,
    [mediaId, sourceId]
  );
}

export async function captureXPostSnapshot(sourceId, tweetUrl, incidentId, updateId, uploadedBy) {
  const html = buildEmbedHtml(tweetUrl);
  let browser;

  try {
    browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({ viewport: { width: 1200, height: 1200 } });
    const page = await context.newPage();

    await page.setContent(html, { waitUntil: 'networkidle' });
    await page.waitForSelector('iframe', { timeout: 15000 });

    // The tweet card is rendered inside the first iframe created by widgets.js.
    const iframe = page.locator('iframe').first();
    const screenshotBuffer = await iframe.screenshot({ type: 'png' });

    await browser.close();
    browser = null;

    // Compress and generate thumbnail.
    const processed = await processImage(screenshotBuffer, 'image/png');

    const incidentTitle = await getIncidentTitle(incidentId);
    const storedName = generateMediaFilename(incidentTitle || incidentId, 'webp');
    const baseName = storedName.replace(/\.webp$/, '');
    const thumbName = generateThumbFilename(baseName, 'webp');
    const folderPath = `incidents/${incidentId}`;

    const fileUrl = await storage.upload(processed.originalBuffer, `${folderPath}/${storedName}`, 'image/webp');
    const thumbnailUrl = await storage.upload(processed.thumbnailBuffer, `${folderPath}/${thumbName}`, 'image/webp');

    const mediaRecord = await createMediaRecord({
      incidentId,
      updateId,
      originalName: 'x-post-snapshot.png',
      storedName,
      fileType: 'image',
      mimeType: 'image/webp',
      fileSizeBytes: processed.originalBuffer.length,
      fileUrl,
      thumbnailUrl,
      width: processed.width,
      height: processed.height,
      uploadedBy,
      caption: `Archived snapshot of ${tweetUrl}`,
    });

    await updateSourceSnapshot(sourceId, mediaRecord.id);

    return mediaRecord;
  } catch (err) {
    if (browser) {
      try {
        await browser.close();
      } catch {
        // ignore
      }
    }
    throw err;
  }
}
