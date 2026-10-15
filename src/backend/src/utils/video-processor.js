import { execFile } from 'child_process';
import { promisify } from 'util';
import { writeFile, unlink } from 'fs/promises';
import { tmpdir } from 'os';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { randomUUID } from 'crypto';
import sharp from 'sharp';

const execFileAsync = promisify(execFile);

const FFMPEG_PATH =
  process.env.FFMPEG_PATH ||
  join(dirname(fileURLToPath(import.meta.url)), '../../../..', 'tools', 'ffmpeg');

const THUMB_WIDTH = 300;
const THUMB_HEIGHT = 200;

async function extractPosterFrame(inputPath, seekSeconds) {
  const args = [
    '-ss', String(seekSeconds),
    '-i', inputPath,
    '-frames:v', '1',
    '-f', 'image2pipe',
    '-c:v', 'png',
    '-',
  ];
  try {
    const { stdout } = await execFileAsync(FFMPEG_PATH, args, {
      encoding: 'buffer',
      maxBuffer: 64 * 1024 * 1024,
      timeout: 30000,
    });
    return stdout && stdout.length > 0 ? stdout : null;
  } catch {
    return null;
  }
}

/**
 * Process an uploaded video:
 * 1. Pass the original through unchanged (no transcoding for MVP)
 * 2. Extract a poster frame (1s mark, fallback 0s) via ffmpeg
 * 3. Convert the poster to a WebP thumbnail (same sizing as image thumbs)
 *
 * Returns: { processedBuffer, posterBuffer, width, height }
 */
export async function processVideo(inputBuffer, mimeType) {
  const ext = (mimeType.split('/')[1] || 'mp4').replace(/[^a-z0-9]/gi, '');
  const tmpPath = join(tmpdir(), `im24-vid-${randomUUID()}.${ext}`);

  try {
    await writeFile(tmpPath, inputBuffer);

    let posterRaw = await extractPosterFrame(tmpPath, 1);
    if (!posterRaw) {
      posterRaw = await extractPosterFrame(tmpPath, 0);
    }
    if (!posterRaw) {
      return { processedBuffer: inputBuffer, posterBuffer: null, width: null, height: null };
    }

    const meta = await sharp(posterRaw, { failOnError: false }).metadata();
    const posterBuffer = await sharp(posterRaw, { failOnError: false })
      .resize(THUMB_WIDTH, THUMB_HEIGHT, { fit: 'cover' })
      .webp({ quality: 70, effort: 4 })
      .toBuffer();

    return {
      processedBuffer: inputBuffer,
      posterBuffer,
      width: meta.width || null,
      height: meta.height || null,
    };
  } catch (err) {
    console.error('[processVideo] thumbnail extraction failed:', err.message);
    return { processedBuffer: inputBuffer, posterBuffer: null, width: null, height: null };
  } finally {
    await unlink(tmpPath).catch(() => {});
  }
}
