#!/usr/bin/env node

import { readFile } from 'node:fs/promises';
import { basename, dirname, extname, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';
import pg from 'pg';

const backendDir = resolve(dirname(fileURLToPath(import.meta.url)), '../src/backend');
dotenv.config({
  path: resolve(backendDir, process.env.NODE_ENV === 'production' ? '.env.production' : '.env.development'),
});

const { getStorageEngine } = await import('../src/backend/src/storage/index.js');
const { LocalStorage } = await import('../src/backend/src/storage/local.storage.js');
const { generateThumbFilename } = await import('../src/backend/src/utils/slugify.js');
const { processVideo } = await import('../src/backend/src/utils/video-processor.js');
const { Pool } = pg;
const dryRun = process.argv.includes('--dry-run');
const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432', 10),
  database: process.env.DB_NAME || 'intelmap24_dev',
  user: process.env.DB_USER || 'intelmap24_user',
  password: process.env.DB_PASSWORD || '',
});
const storage = getStorageEngine();

if (!(storage instanceof LocalStorage)) {
  throw new Error('Video thumbnail backfill currently supports local storage only.');
}

function relativeMediaPath(fileUrl) {
  const pathname = fileUrl.startsWith('http') ? new URL(fileUrl).pathname : fileUrl;
  const marker = '/uploads/';
  const index = pathname.indexOf(marker);
  if (index === -1) throw new Error(`Unsupported media URL: ${fileUrl}`);
  return pathname.slice(index + marker.length);
}

function safeSourcePath(relativePath) {
  const baseDir = resolve(storage.baseDir);
  const sourcePath = resolve(baseDir, relativePath);
  if (!sourcePath.startsWith(`${baseDir}${sep}`)) {
    throw new Error(`Media path escapes upload directory: ${relativePath}`);
  }
  return sourcePath;
}

async function main() {
  const client = await pool.connect();
  const failures = [];
  let updated = 0;

  try {
    const { rows } = await client.query(
      `SELECT id, incident_id, file_url, mime_type
       FROM incident_media
       WHERE file_type = 'video' AND thumbnail_url IS NULL
       ORDER BY created_at ASC`,
    );
    console.log(`${dryRun ? '[dry-run] ' : ''}Found ${rows.length} videos without thumbnails.`);

    for (const row of rows) {
      try {
        const relativePath = relativeMediaPath(row.file_url);
        const sourcePath = safeSourcePath(relativePath);
        const input = await readFile(sourcePath);
        const processed = await processVideo(input, row.mime_type);
        if (!processed.posterBuffer) {
          throw new Error('ffmpeg could not extract a poster frame');
        }

        const extension = extname(relativePath);
        const baseName = basename(relativePath, extension);
        const thumbPath = `${dirname(relativePath)}/${generateThumbFilename(baseName, 'webp')}`;

        if (!dryRun) {
          const thumbnailUrl = await storage.upload(processed.posterBuffer, thumbPath, 'image/webp');
          const result = await client.query(
            `UPDATE incident_media
             SET thumbnail_url = $1, width = $2, height = $3, updated_at = NOW()
             WHERE id = $4 AND thumbnail_url IS NULL`,
            [thumbnailUrl, processed.width, processed.height, row.id],
          );
          if (result.rowCount !== 1) throw new Error('Database record was not updated');
        }

        updated += 1;
        console.log(`  ${dryRun ? 'Verified' : 'Updated'} ${row.id} → ${thumbPath}`);
      } catch (error) {
        failures.push({ id: row.id, message: error.message });
        console.error(`  Failed ${row.id}: ${error.message}`);
      }
    }

    console.log(`${dryRun ? 'Verified' : 'Updated'}: ${updated}; failed: ${failures.length}.`);
    if (failures.length) process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((error) => {
  console.error('Backfill failed:', error);
  process.exitCode = 1;
});
