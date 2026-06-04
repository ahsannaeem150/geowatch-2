import sharp from 'sharp';

const MAX_IMAGE_WIDTH = 1920;
const MAX_IMAGE_HEIGHT = 1080;
const THUMB_WIDTH = 300;
const THUMB_HEIGHT = 200;
const WEBP_QUALITY = 80;

/**
 * Process an uploaded image:
 * 1. Resize if exceeds max dimensions (preserves aspect ratio)
 * 2. Convert to WebP
 * 3. Generate thumbnail
 *
 * Returns: { originalBuffer, thumbnailBuffer, width, height }
 */
export async function processImage(inputBuffer, originalMimeType) {
  const pipeline = sharp(inputBuffer, {
    failOnError: false,
    limitInputPixels: 268402689, // ~16k x 16k
  });

  // Get metadata first
  const metadata = await pipeline.clone().metadata();

  // Resize if too large, then convert to WebP
  const processedBuffer = await pipeline
    .resize(MAX_IMAGE_WIDTH, MAX_IMAGE_HEIGHT, {
      fit: 'inside',
      withoutEnlargement: true,
    })
    .webp({ quality: WEBP_QUALITY, effort: 4 })
    .toBuffer();

  // Generate thumbnail (cover crop)
  const thumbnailBuffer = await sharp(inputBuffer)
    .resize(THUMB_WIDTH, THUMB_HEIGHT, {
      fit: 'cover',
      position: 'attention', // Smart crop to interesting area
    })
    .webp({ quality: 70, effort: 4 })
    .toBuffer();

  return {
    originalBuffer: processedBuffer,
    thumbnailBuffer,
    width: metadata.width,
    height: metadata.height,
  };
}

/**
 * Detect if a mime type is an image we can process.
 */
export function isProcessableImage(mimeType) {
  return ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif', 'image/avif'].includes(mimeType);
}

/**
 * Detect if a mime type is a video.
 */
export function isVideo(mimeType) {
  return ['video/mp4', 'video/webm', 'video/quicktime', 'video/avi', 'video/x-matroska'].includes(mimeType);
}
