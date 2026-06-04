/**
 * Video processing placeholder.
 *
 * For MVP: videos are stored as-is (no server-side transcoding).
 * This keeps the backend lightweight and avoids the ffmpeg dependency
 * during development.
 *
 * Future enhancement (post-MVP):
 *   1. Save temp file from buffer
 *   2. Run ffmpeg to compress (H.264 / HEVC at configurable bitrate)
 *   3. Extract poster frame at 1s mark
 *   4. Return { processedBuffer, posterBuffer, duration, width, height }
 *
 * @param {Buffer} inputBuffer — raw file buffer from Multer
 * @param {string} mimeType — original MIME type (e.g. 'video/mp4')
 * @returns {Promise<{processedBuffer: Buffer, posterBuffer: Buffer|null, duration: number|null, width: number|null, height: number|null}>}
 */
export async function processVideo(inputBuffer, mimeType) {
  // MVP pass-through — return buffer unchanged
  return {
    processedBuffer: inputBuffer,
    posterBuffer: null,
    duration: null,
    width: null,
    height: null,
  };
}
