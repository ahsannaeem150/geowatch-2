# GeoWatch Media Storage — Implementation Plan

> **Read this plan before implementing any media upload feature.**
> This document is the single source of truth for the local-to-cloud media storage roadmap.
> Implement phase by phase. Do not skip phases.

---

## Table of Contents

1. [Architecture Overview](#1-architecture-overview)
2. [Phase Map](#2-phase-map)
3. [Phase 1 — Database Schema](#phase-1--database-schema)
4. [Phase 2 — Storage Abstraction Layer](#phase-2--storage-abstraction-layer)
5. [Phase 3 — Image Processing Pipeline](#phase-3--image-processing-pipeline)
6. [Phase 4 — Backend Media API](#phase-4--backend-media-api)
7. [Phase 5 — Static File Serving](#phase-5--static-file-serving)
8. [Phase 6 — Frontend Upload Components](#phase-6--frontend-upload-components)
9. [Phase 7 — Frontend Media Gallery & Viewer](#phase-7--frontend-media-gallery--viewer)
10. [Phase 8 — Incident Form Integration](#phase-8--incident-form-integration)
11. [Phase 9 — Video Upload Support](#phase-9--video-upload-support)
12. [Phase 10 — Build, Test, Commit](#phase-10--build-test-commit)
13. [Production Migration — Phase A](#production-migration--phase-a--cloudflare-account--r2-bucket)
14. [Production Migration — Phase B](#production-migration--phase-b--r2-storage-implementation)
15. [Production Migration — Phase C](#production-migration--phase-c--env-switch--testing)
16. [Production Migration — Phase D](#production-migration--phase-d--cdn-custom-domain)
17. [Appendix A — File Structure](#appendix-a--file-structure)
18. [Appendix B — Environment Variables](#appendix-b--environment-variables)
19. [Appendix C — Sharp Configuration Reference](#appendix-c--sharp-configuration-reference)
20. [Appendix D — Common Issues](#appendix-d--common-issues)

---

## 1. Architecture Overview

### 1.1 The Two-Backend Strategy

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   Frontend      │────▶│   Backend API   │────▶│   PostgreSQL    │
│  (React/Vite)   │     │   (Express)     │     │   (Metadata)    │
└─────────────────┘     └─────────────────┘     └─────────────────┘
         │                       │
         │                       │
         ▼                       ▼
┌─────────────────┐     ┌─────────────────┐
│   Multer        │     │   Sharp         │
│   (file parse)  │     │   (compress)    │
└─────────────────┘     └─────────────────┘
                                 │
                                 ▼
                        ┌─────────────────┐
                        │  Storage Engine │
                        │  (swappable)    │
                        └─────────────────┘
                                 │
                    ┌────────────┴────────────┐
                    │                         │
                    ▼                         ▼
           ┌─────────────┐          ┌─────────────────┐
           │  Local Disk │          │  Cloudflare R2  │
           │  (./uploads)│          │  (Production)   │
           └─────────────┘          └─────────────────┘
```

### 1.2 Storage Interface Contract

Every storage engine implements the same interface:

```javascript
interface StorageEngine {
  // Upload a file buffer to storage, return the public-accessible URL
  upload(buffer, filename, contentType) → Promise<string>

  // Get the public URL for a stored file (may be same as upload result)
  getUrl(filePathOrKey) → string

  // Delete a file from storage
  delete(filePathOrKey) → Promise<void>

  // (Optional) Generate a pre-signed URL for direct client uploads
  getUploadUrl(filename, contentType, expiresSeconds) → Promise<{url, fields}>
}
```

### 1.3 Data Flow (Local)

```
1. User selects file in browser
2. Frontend POSTs multipart/form-data to /api/v1/incidents/:id/media
3. Backend: Multer parses multipart → memory buffer
4. Backend: Sharp compresses image, generates thumbnail
5. Backend: LocalStorage engine writes to ./uploads/incidents/{id}/
6. Backend: INSERT into incident_media table
7. Backend: Returns media metadata + URLs
8. Frontend: Displays thumbnail + clickable full image
9. Browser GETs image from /uploads/... served by Express static
```

### 1.4 Data Flow (Production — R2)

```
1. User selects file in browser
2. Frontend POSTs multipart/form-data to /api/v1/incidents/:id/media
3. Backend: Multer parses multipart → memory buffer
4. Backend: Sharp compresses image, generates thumbnail
5. Backend: R2Storage engine uploads to Cloudflare R2 bucket
6. Backend: INSERT into incident_media table with R2 public URL
7. Backend: Returns media metadata + URLs
8. Frontend: Displays thumbnail + clickable full image
9. Browser GETs image from R2 CDN (zero egress cost)
```

**Note:** For Phase 1–10 (local dev), the backend ALWAYS receives the file, processes it, and stores it. The storage backend is the ONLY thing that changes. This keeps testing simple and the code identical between environments.

**Advanced (Post-Production):** Pre-signed direct client uploads can be added later as an optimization. Not needed for MVP.

---

## 2. Phase Map

### Local Development Phases (Phase 1–10)

| Phase | Name | Scope | Files Created | Files Modified |
|-------|------|-------|---------------|----------------|
| 1 | Database Schema | `incident_media` table + migration | `docs/media-migration.sql` | `docs/database-schema.sql` |
| 2 | Storage Abstraction | Interface + Local engine | `src/backend/src/storage/index.js`, `local.storage.js` | `src/backend/.env.example` |
| 3 | Image Processing | Sharp install + processor | `src/backend/src/utils/image-processor.js` | `src/backend/package.json` |
| 4 | Backend Media API | Upload/list/delete endpoints | `media.routes.js`, `media.controller.js`, `media.service.js`, `media.schema.js` | `server.js`, `api.js` |
| 5 | Static File Serving | Express static middleware for /uploads | — | `server.js` |
| 6 | Frontend Upload | Drag-drop file picker component | `MediaUploader.jsx` | `api.js` |
| 7 | Frontend Gallery | Thumbnail grid + lightbox viewer | `MediaGallery.jsx`, `MediaLightbox.jsx` | `IncidentDetailPanel.jsx` |
| 8 | Form Integration | Wire upload into incident create/edit | — | `EventForm.jsx`, `IncidentDetailPanel.jsx` |
| 9 | Video Support | Video upload + compression + player | `VideoPlayer.jsx` | `image-processor.js` |
| 10 | Build & Test | Build all apps, test upload flow | — | `commit.md` |

### Production Migration Phases (Phase A–D)

| Phase | Name | Scope | Effort |
|-------|------|-------|--------|
| A | Cloudflare Account + R2 Bucket | Create account, bucket, API token | ~15 min manual |
| B | R2 Storage Implementation | Write `r2.storage.js` engine | ~1 hour |
| C | Env Switch + Test | Change `STORAGE_PROVIDER=r2`, test | ~30 min |
| D | CDN Custom Domain (Optional) | Set up `media.geowatch.app` CNAME | ~15 min |

---

## Phase 1 — Database Schema

### 1.1 Objective
Create the `incident_media` table and add it to the main schema file.

### 1.2 SQL to Create

Create `docs/media-migration.sql`:

```sql
-- Migration: Add incident_media table for file uploads
-- Run: sudo -u postgres psql -d geowatch_dev -f docs/media-migration.sql

CREATE TABLE IF NOT EXISTS incident_media (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    incident_id UUID NOT NULL REFERENCES incidents(id) ON DELETE CASCADE,
    
    -- File metadata
    original_name VARCHAR(500) NOT NULL,
    stored_name VARCHAR(500) NOT NULL,        -- UUID-based filename on disk/R2
    file_type VARCHAR(20) NOT NULL,           -- 'image' | 'video'
    mime_type VARCHAR(50) NOT NULL,           -- 'image/webp', 'video/mp4'
    file_size_bytes INTEGER NOT NULL,
    
    -- URLs / paths
    file_url TEXT NOT NULL,                   -- Full URL or relative path
    thumbnail_url TEXT,                       -- Generated thumbnail URL
    
    -- Image dimensions (NULL for video until processed)
    width INTEGER,
    height INTEGER,
    
    -- Processing metadata
    is_processed BOOLEAN DEFAULT true,        -- Sharp/FFmpeg processing complete
    processing_error TEXT,                    -- Error message if processing failed
    
    -- Ordering
    display_order INTEGER DEFAULT 0,
    
    -- Audit
    uploaded_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_media_incident ON incident_media(incident_id);
CREATE INDEX idx_media_created ON incident_media(created_at DESC);
CREATE INDEX idx_media_type ON incident_media(incident_id, file_type);
```

### 1.3 Also Append to `docs/database-schema.sql`

Append the `incident_media` CREATE TABLE to the end of the existing schema file so new setups get it automatically.

### 1.4 Run the Migration

```bash
sudo -u postgres psql -d geowatch_dev -f docs/media-migration.sql
```

### 1.5 Verify

```bash
sudo -u postgres psql -d geowatch_dev -c "\dt incident_media"
sudo -u postgres psql -d geowatch_dev -c "\d incident_media"
```

---

## Phase 2 — Storage Abstraction Layer

### 2.1 Objective
Build the storage engine interface and the local disk implementation.

### 2.2 Install Dependencies

```bash
cd src/backend
npm install multer sharp
npm install -D @types/multer  # if using TypeScript (not needed for JS)
```

### 2.3 Create `src/backend/src/storage/index.js`

This is the storage factory. It reads `STORAGE_PROVIDER` env var and returns the correct engine.

```javascript
import { LocalStorage } from './local.storage.js';
// import { R2Storage } from './r2.storage.js';  // Phase B (production)

const PROVIDER = process.env.STORAGE_PROVIDER || 'local';

export function getStorageEngine() {
  switch (PROVIDER) {
    case 'local':
      return new LocalStorage();
    // case 'r2':
    //   return new R2Storage();
    default:
      throw new Error(`Unknown storage provider: ${PROVIDER}`);
  }
}

export { LocalStorage };
```

### 2.4 Create `src/backend/src/storage/local.storage.js`

```javascript
import { writeFile, mkdir, unlink } from 'fs/promises';
import { existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const UPLOAD_DIR = process.env.UPLOAD_DIR || join(__dirname, '../../../../uploads');
const BASE_URL = process.env.API_URL || 'http://localhost:3000';

export class LocalStorage {
  constructor() {
    this.baseDir = UPLOAD_DIR;
    this.baseUrl = BASE_URL;
  }

  async upload(buffer, filename, contentType) {
    const filePath = join(this.baseDir, filename);
    await mkdir(dirname(filePath), { recursive: true });
    await writeFile(filePath, buffer);
    return this.getUrl(filename);
  }

  getUrl(filename) {
    // Return URL path that Express static will serve
    return `${this.baseUrl}/uploads/${filename.replace(/\\/g, '/')}`;
  }

  async delete(filename) {
    const filePath = join(this.baseDir, filename);
    try {
      await unlink(filePath);
    } catch (err) {
      if (err.code !== 'ENOENT') throw err;
    }
  }
}
```

### 2.5 Update `src/backend/.env.example`

```bash
# File Storage
STORAGE_PROVIDER=local
UPLOAD_DIR=./uploads
```

### 2.6 Update `src/backend/.env.development`

```bash
STORAGE_PROVIDER=local
UPLOAD_DIR=./uploads
```

### 2.7 Verify

```bash
cd src/backend
node -e "import('./src/storage/index.js').then(m => console.log(m.getStorageEngine().constructor.name))"
# Should print: LocalStorage
```

---

## Phase 3 — Image Processing Pipeline

### 3.1 Objective
Build the Sharp-based image processor that compresses images, converts to WebP, and generates thumbnails.

### 3.2 Create `src/backend/src/utils/image-processor.js`

```javascript
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
```

### 3.3 Configuration Constants

| Setting | Value | Rationale |
|---------|-------|-----------|
| MAX_IMAGE_WIDTH | 1920 | Full HD width, enough for detail |
| MAX_IMAGE_HEIGHT | 1080 | Full HD height |
| THUMB_WIDTH | 300 | Gallery thumbnail width |
| THUMB_HEIGHT | 200 | Gallery thumbnail height (3:2 ratio) |
| WEBP_QUALITY | 80 | Good quality, ~60% smaller than JPEG |
| limitInputPixels | 268,402,689 | Prevents DoS via giant images (~16K²) |

---

## Phase 4 — Backend Media API

### 4.1 Objective
Create the full backend API for media: upload, list, delete, and update display order.

### 4.2 Create `src/backend/src/services/media.service.js`

```javascript
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
```

### 4.3 Create `src/backend/src/controllers/media.controller.js`

```javascript
import { v4 as uuidv4 } from 'uuid'; // use crypto.randomUUID if preferred
import { getStorageEngine } from '../storage/index.js';
import { processImage, isProcessableImage, isVideo } from '../utils/image-processor.js';
import * as mediaService from '../services/media.service.js';

const storage = getStorageEngine();

// Multer stores file in memory as buffer: req.file.buffer
export async function uploadMedia(req, res) {
  try {
    if (!req.file) {
      return res.apiError('No file provided', 'VALIDATION_ERROR', 400);
    }

    const { incidentId } = req.params;
    const { originalname, mimetype, size, buffer } = req.file;
    const fileType = isProcessableImage(mimetype) ? 'image' : isVideo(mimetype) ? 'video' : 'other';

    if (fileType === 'other') {
      return res.apiError('Unsupported file type', 'VALIDATION_ERROR', 400);
    }

    const ext = fileType === 'image' ? 'webp' : mimetype.split('/')[1] || 'bin';
    const storedName = `${uuidv4()}.${ext}`;
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
      fileUrl = await storage.upload(processedBuffer, fullPath, `image/webp`);

      // Upload thumbnail
      const thumbName = `${uuidv4()}_thumb.webp`;
      const thumbPath = `${folderPath}/${thumbName}`;
      thumbnailUrl = await storage.upload(processed.thumbnailBuffer, thumbPath, `image/webp`);
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
  } catch (err) {
    console.error('Upload error:', err);
    res.apiError(err.message || 'Upload failed', 'SERVER_ERROR', 500);
  }
}

export async function listMedia(req, res) {
  const media = await mediaService.listMediaByIncident(req.params.incidentId);
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
```

### 4.4 Create `src/backend/src/validators/media.schema.js`

```javascript
import { z } from 'zod';

export const uploadMediaSchema = z.object({
  // Multer handles the file; we only validate non-file params here
  // This schema is mostly a placeholder for route validation middleware
});

export const reorderMediaSchema = z.object({
  displayOrder: z.number().int().min(0),
});
```

### 4.5 Create `src/backend/src/routes/media.routes.js`

```javascript
import { Router } from 'express';
import multer from 'multer';
import { uploadMedia, listMedia, deleteMedia, reorderMedia } from '../controllers/media.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { requireRole } from '../middleware/role.middleware.js';
import { validateRequest } from '../middleware/validate-request.js';
import { reorderMediaSchema } from '../validators/media.schema.js';

const router = Router();

// Multer: store in memory (we process with Sharp then save to disk/R2)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB max
    files: 10,                  // 10 files per request
  },
  fileFilter: (req, file, cb) => {
    const allowed = [
      'image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif', 'image/avif',
      'video/mp4', 'video/webm', 'video/quicktime',
    ];
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`Unsupported file type: ${file.mimetype}`), false);
    }
  },
});

// Routes
router.get('/', listMedia);
router.post(
  '/',
  authenticate,
  requireRole(['admin', 'super_admin']),
  upload.single('file'),           // 'file' is the multipart field name
  uploadMedia
);
router.delete(
  '/:mediaId',
  authenticate,
  requireRole(['admin', 'super_admin']),
  deleteMedia
);
router.patch(
  '/:mediaId/order',
  authenticate,
  requireRole(['admin', 'super_admin']),
  validateRequest(reorderMediaSchema),
  reorderMedia
);

export default router;
```

### 4.6 Wire Routes in `server.js`

Add this line in the routes section of `server.js`:

```javascript
import mediaRoutes from './src/routes/media.routes.js';
// ...
app.use('/api/v1/incidents/:id/media', mediaRoutes);
```

**IMPORTANT:** Mount this BEFORE the incident routes to avoid conflicts, OR mount it inside incident routes. Since the controller expects `req.params.id` for incidentId, mounting at `/api/v1/incidents/:id/media` is correct.

### 4.7 Update `src/admin-web/src/services/api.js`

Add these methods:

```javascript
// Media
uploadMedia: (incidentId, file) => {
  const formData = new FormData();
  formData.append('file', file);
  return request(`/incidents/${incidentId}/media`, {
    method: 'POST',
    body: formData,
    // DO NOT set Content-Type header — browser sets it with boundary for FormData
  });
},

listMedia: (incidentId) => request(`/incidents/${incidentId}/media`),

deleteMedia: (incidentId, mediaId) =>
  request(`/incidents/${incidentId}/media/${mediaId}`, { method: 'DELETE' }),

reorderMedia: (incidentId, mediaId, displayOrder) =>
  request(`/incidents/${incidentId}/media/${mediaId}/order`, {
    method: 'PATCH',
    body: { displayOrder },
  }),
```

**CRITICAL:** The `request()` helper must NOT set `Content-Type: application/json` when the body is FormData. Check the request helper and make it conditional:

```javascript
function request(endpoint, options = {}) {
  const url = `${BASE_URL}${endpoint}`;
  const headers = {};
  
  // Only set JSON content-type for non-FormData bodies
  if (!(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
  }
  
  // ... rest of request logic
}
```

---

## Phase 5 — Static File Serving

### 5.1 Objective
Serve uploaded files from the `./uploads` directory via Express static middleware.

### 5.2 Update `server.js`

Add this BEFORE the API routes (so /uploads doesn't hit rate limiting):

```javascript
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// ─── Static File Serving (uploads) ───
app.use('/uploads', express.static(join(__dirname, '../uploads'), {
  maxAge: '1d', // Cache for 1 day in development
  immutable: true,
}));
```

### 5.3 Add `uploads/` to `.gitignore`

```gitignore
# Uploads (user-generated content, never commit)
/uploads/
```

### 5.4 Verify

After uploading a file, test:
```bash
curl http://localhost:3000/uploads/incidents/{uuid}/{filename}.webp
```

---

## Phase 6 — Frontend Upload Components

### 6.1 Objective
Build the drag-and-drop file uploader component.

### 6.2 Create `src/admin-web/src/components/Media/MediaUploader.jsx`

```jsx
import { useState, useRef, useCallback } from 'react';

/**
 * MediaUploader
 * Props:
 *   - onUpload: (file) => Promise<void> — called for each file
 *   - accept?: string — default: 'image/*,video/*'
 *   - maxFiles?: number — default: 10
 *   - disabled?: boolean
 */
export function MediaUploader({ onUpload, accept = 'image/*,video/*', maxFiles = 10, disabled = false }) {
  const [isDragging, setIsDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState({});
  const inputRef = useRef(null);

  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    setIsDragging(false);
    const files = Array.from(e.dataTransfer.files).slice(0, maxFiles);
    handleFiles(files);
  }, [maxFiles, onUpload]);

  const handleFileInput = useCallback((e) => {
    const files = Array.from(e.target.files).slice(0, maxFiles);
    handleFiles(files);
    e.target.value = ''; // Reset so same file can be selected again
  }, [maxFiles, onUpload]);

  const handleFiles = async (files) => {
    setUploading(true);
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      setProgress(prev => ({ ...prev, [file.name]: 'uploading' }));
      try {
        await onUpload(file);
        setProgress(prev => ({ ...prev, [file.name]: 'done' }));
      } catch (err) {
        setProgress(prev => ({ ...prev, [file.name]: 'error' }));
      }
    }
    setUploading(false);
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'uploading': return '⏳';
      case 'done': return '✅';
      case 'error': return '❌';
      default: return '';
    }
  };

  return (
    <div className="media-uploader">
      <div
        className={`media-dropzone ${isDragging ? 'dragging' : ''} ${disabled || uploading ? 'disabled' : ''}`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => !disabled && !uploading && inputRef.current?.click()}
      >
        <div className="media-dropzone-icon">📎</div>
        <p className="media-dropzone-text">
          {isDragging ? 'Drop files here' : 'Click or drag files to upload'}
        </p>
        <p className="media-dropzone-hint">
          Images (JPG, PNG, GIF, WebP) and videos (MP4, WebM) up to 50MB
        </p>
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          multiple
          onChange={handleFileInput}
          style={{ display: 'none' }}
        />
      </div>

      {Object.keys(progress).length > 0 && (
        <div className="media-upload-progress">
          {Object.entries(progress).map(([name, status]) => (
            <div key={name} className="media-upload-item">
              <span className="media-upload-name">{name}</span>
              <span className="media-upload-status">{getStatusIcon(status)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
```

### 6.3 CSS for MediaUploader

Add to `src/admin-web/src/index.css`:

```css
.media-uploader { margin: 12px 0; }
.media-dropzone {
  border: 2px dashed var(--border-color, #2a2e3b);
  border-radius: 8px;
  padding: 32px;
  text-align: center;
  cursor: pointer;
  transition: all 0.2s ease;
  background: var(--bg-surface, #1a1d29);
}
.media-dropzone:hover { border-color: var(--accent-cyan, #00d4ff); }
.media-dropzone.dragging {
  border-color: var(--accent-cyan, #00d4ff);
  background: rgba(0, 212, 255, 0.05);
}
.media-dropzone.disabled { opacity: 0.5; cursor: not-allowed; }
.media-dropzone-icon { font-size: 32px; margin-bottom: 8px; }
.media-dropzone-text { font-size: 14px; color: var(--text-primary, #e8e9ec); margin: 0; }
.media-dropzone-hint { font-size: 12px; color: var(--text-muted, #5a5e6b); margin: 4px 0 0; }
.media-upload-progress { margin-top: 12px; }
.media-upload-item {
  display: flex;
  justify-content: space-between;
  padding: 6px 10px;
  background: var(--bg-hover, #222636);
  border-radius: 4px;
  margin-bottom: 4px;
  font-size: 13px;
}
.media-upload-name { color: var(--text-secondary, #9a9da8); }
.media-upload-status { font-size: 14px; }
```

---

## Phase 7 — Frontend Media Gallery & Viewer

### 7.1 Objective
Build the media gallery (thumbnail grid) and lightbox viewer for incident detail panel.

### 7.2 Create `src/admin-web/src/components/Media/MediaGallery.jsx`

```jsx
import { useState } from 'react';
import { MediaLightbox } from './MediaLightbox';

/**
 * MediaGallery
 * Props:
 *   - media: Array<{ id, file_url, thumbnail_url, file_type, width, height, original_name }>
 *   - onDelete: (mediaId) => void
 *   - canEdit: boolean
 */
export function MediaGallery({ media, onDelete, canEdit = false }) {
  const [lightboxIndex, setLightboxIndex] = useState(null);

  if (!media || media.length === 0) return null;

  const images = media.filter(m => m.file_type === 'image');
  const videos = media.filter(m => m.file_type === 'video');

  return (
    <div className="media-gallery">
      {images.length > 0 && (
        <div className="media-section">
          <h4 className="media-section-title">📷 Photos ({images.length})</h4>
          <div className="media-grid">
            {images.map((item, index) => (
              <div
                key={item.id}
                className="media-grid-item"
                onClick={() => setLightboxIndex(index)}
              >
                <img
                  src={item.thumbnail_url || item.file_url}
                  alt={item.original_name}
                  loading="lazy"
                  className="media-thumb"
                />
                {canEdit && (
                  <button
                    className="media-delete-btn"
                    onClick={(e) => { e.stopPropagation(); onDelete?.(item.id); }}
                    title="Delete"
                  >
                    ×
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {videos.length > 0 && (
        <div className="media-section">
          <h4 className="media-section-title">🎥 Videos ({videos.length})</h4>
          <div className="media-grid">
            {videos.map((item) => (
              <div key={item.id} className="media-grid-item media-video-item">
                <video
                  src={item.file_url}
                  className="media-thumb"
                  preload="metadata"
                  controls
                />
                {canEdit && (
                  <button
                    className="media-delete-btn"
                    onClick={(e) => { e.stopPropagation(); onDelete?.(item.id); }}
                    title="Delete"
                  >
                    ×
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {lightboxIndex !== null && (
        <MediaLightbox
          items={images}
          startIndex={lightboxIndex}
          onClose={() => setLightboxIndex(null)}
        />
      )}
    </div>
  );
}
```

### 7.3 Create `src/admin-web/src/components/Media/MediaLightbox.jsx`

```jsx
import { useState, useEffect, useCallback } from 'react';

/**
 * MediaLightbox
 * Props:
 *   - items: Array of media objects
 *   - startIndex: number
 *   - onClose: () => void
 */
export function MediaLightbox({ items, startIndex = 0, onClose }) {
  const [currentIndex, setCurrentIndex] = useState(startIndex);
  const [loaded, setLoaded] = useState(false);

  const current = items[currentIndex];

  const goNext = useCallback(() => {
    setCurrentIndex(i => (i + 1) % items.length);
    setLoaded(false);
  }, [items.length]);

  const goPrev = useCallback(() => {
    setCurrentIndex(i => (i - 1 + items.length) % items.length);
    setLoaded(false);
  }, [items.length]);

  // Keyboard navigation
  useEffect(() => {
    const handleKey = (e) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowRight') goNext();
      if (e.key === 'ArrowLeft') goPrev();
    };
    document.addEventListener('keydown', handleKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', handleKey);
      document.body.style.overflow = '';
    };
  }, [onClose, goNext, goPrev]);

  return (
    <div className="media-lightbox" onClick={onClose}>
      <div className="media-lightbox-backdrop" />
      <div className="media-lightbox-content" onClick={e => e.stopPropagation()}>
        <button className="media-lightbox-close" onClick={onClose}>×</button>

        {items.length > 1 && (
          <>
            <button className="media-lightbox-nav prev" onClick={goPrev}>‹</button>
            <button className="media-lightbox-nav next" onClick={goNext}>›</button>
          </>
        )}

        <div className="media-lightbox-image-wrap">
          {!loaded && <div className="media-lightbox-loader">Loading...</div>}
          <img
            src={current.file_url}
            alt={current.original_name}
            className={`media-lightbox-image ${loaded ? 'loaded' : ''}`}
            onLoad={() => setLoaded(true)}
          />
        </div>

        <div className="media-lightbox-info">
          <span>{currentIndex + 1} / {items.length}</span>
          <span className="media-lightbox-name">{current.original_name}</span>
          {current.width && current.height && (
            <span>{current.width} × {current.height}</span>
          )}
        </div>
      </div>
    </div>
  );
}
```

### 7.4 CSS for Gallery & Lightbox

Add to `src/admin-web/src/index.css`:

```css
/* Gallery */
.media-gallery { margin-top: 16px; }
.media-section { margin-bottom: 16px; }
.media-section-title {
  font-size: 13px;
  font-weight: 600;
  color: var(--text-secondary, #9a9da8);
  margin: 0 0 8px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}
.media-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
  gap: 8px;
}
.media-grid-item {
  position: relative;
  aspect-ratio: 3/2;
  border-radius: 6px;
  overflow: hidden;
  cursor: pointer;
  background: var(--bg-hover, #222636);
  border: 1px solid var(--border-color, #2a2e3b);
}
.media-grid-item:hover { border-color: var(--accent-cyan, #00d4ff); }
.media-thumb {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}
.media-delete-btn {
  position: absolute;
  top: 4px;
  right: 4px;
  width: 22px;
  height: 22px;
  border-radius: 4px;
  border: none;
  background: rgba(0,0,0,0.6);
  color: #fff;
  font-size: 16px;
  line-height: 1;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0;
  transition: opacity 0.15s;
}
.media-grid-item:hover .media-delete-btn { opacity: 1; }
.media-delete-btn:hover { background: var(--danger, #ff4757); }
.media-video-item video { pointer-events: none; }
.media-video-item:hover video { pointer-events: auto; }

/* Lightbox */
.media-lightbox {
  position: fixed;
  inset: 0;
  z-index: 9999;
  display: flex;
  align-items: center;
  justify-content: center;
}
.media-lightbox-backdrop {
  position: absolute;
  inset: 0;
  background: rgba(0, 0, 0, 0.92);
  backdrop-filter: blur(4px);
}
.media-lightbox-content {
  position: relative;
  z-index: 1;
  max-width: 90vw;
  max-height: 90vh;
  display: flex;
  flex-direction: column;
  align-items: center;
}
.media-lightbox-close {
  position: absolute;
  top: -40px;
  right: 0;
  background: none;
  border: none;
  color: #fff;
  font-size: 32px;
  cursor: pointer;
  line-height: 1;
}
.media-lightbox-nav {
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  background: rgba(0,0,0,0.5);
  border: none;
  color: #fff;
  font-size: 36px;
  width: 44px;
  height: 60px;
  cursor: pointer;
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
}
.media-lightbox-nav:hover { background: rgba(0,0,0,0.7); }
.media-lightbox-nav.prev { left: -60px; }
.media-lightbox-nav.next { right: -60px; }
.media-lightbox-image-wrap {
  position: relative;
  min-width: 200px;
  min-height: 150px;
}
.media-lightbox-image {
  max-width: 85vw;
  max-height: 80vh;
  object-fit: contain;
  opacity: 0;
  transition: opacity 0.2s;
}
.media-lightbox-image.loaded { opacity: 1; }
.media-lightbox-loader {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--text-muted, #5a5e6b);
  font-size: 14px;
}
.media-lightbox-info {
  display: flex;
  gap: 16px;
  margin-top: 12px;
  color: var(--text-muted, #5a5e6b);
  font-size: 12px;
}
.media-lightbox-name { color: var(--text-secondary, #9a9da8); }
```

---

## Phase 8 — Incident Form Integration

### 8.1 Objective
Wire the media uploader and gallery into the incident detail panel and creation form.

### 8.2 Update `IncidentDetailPanel.jsx` (or equivalent)

Add to the detail panel, after the timeline/sources sections:

```jsx
import { MediaGallery } from '../Media/MediaGallery';
import { MediaUploader } from '../Media/MediaUploader';

// In the component:
const [media, setMedia] = useState([]);

// Fetch media when incident loads
useEffect(() => {
  if (selectedIncident?.id) {
    api.listMedia(selectedIncident.id).then(res => setMedia(res.data.media));
  }
}, [selectedIncident?.id]);

const handleUpload = async (file) => {
  const res = await api.uploadMedia(selectedIncident.id, file);
  setMedia(prev => [...prev, res.data.media]);
};

const handleDeleteMedia = async (mediaId) => {
  if (!confirm('Delete this file?')) return;
  await api.deleteMedia(selectedIncident.id, mediaId);
  setMedia(prev => prev.filter(m => m.id !== mediaId));
};

// In JSX, after timeline/sources:
<div className="panel-section">
  <h3 className="panel-section-title">Media</h3>
  <MediaUploader
    onUpload={handleUpload}
    disabled={uploading}
  />
  <MediaGallery
    media={media}
    onDelete={handleDeleteMedia}
    canEdit={true}
  />
</div>
```

### 8.3 Update Incident Creation Flow

For the incident creation form, media can ONLY be uploaded AFTER the incident is created (since media references `incident_id`). Options:

**Option A (Recommended):** Create incident first → auto-open detail panel → then upload media.

**Option B:** Allow media selection during creation, upload after creation completes.

Implement Option A for simplicity. After incident creation success, show a toast: "Incident created. Add photos and videos in the detail panel."

---

## Phase 9 — Video Upload Support

### 9.1 Objective
Add video upload, basic metadata extraction, and video player.

### 9.2 Video Processing

For MVP, videos are stored as-is (no server-side compression). FFmpeg can be added later.

Create `src/backend/src/utils/video-processor.js` (placeholder for future):

```javascript
/**
 * Video processing placeholder.
 * For MVP: videos are stored as-is.
 * Future: use fluent-ffmpeg to compress, generate poster frame.
 */
export async function processVideo(inputBuffer, mimeType) {
  // MVP: return buffer unchanged
  // Future:
  //   1. Save temp file
  //   2. Run ffmpeg to compress
  //   3. Extract poster frame at 1s mark
  //   4. Return { processedBuffer, posterBuffer, duration, width, height }
  return {
    processedBuffer: inputBuffer,
    posterBuffer: null,
    duration: null,
    width: null,
    height: null,
  };
}
```

### 9.3 Update `media.controller.js` for Videos

In the `uploadMedia` controller, add video handling:

```javascript
// In uploadMedia, replace the video else block with:
} else if (fileType === 'video') {
  const processed = await processVideo(buffer, mimetype);
  processedBuffer = processed.processedBuffer;
  fileUrl = await storage.upload(processedBuffer, fullPath, mimetype);
  // thumbnailUrl = processed.posterBuffer ? await storage.upload(...) : null;
}
```

### 9.4 Video Player Component

The `MediaGallery` already handles videos with the `<video controls>` element. For a more polished player, enhance in a future phase.

---

## Phase 10 — Build, Test, Commit

### 10.1 Build Checklist

```bash
# 1. Install backend deps
cd src/backend && npm install

# 2. Build admin web
cd src/admin-web && npm run build

# 3. Build user web
cd src/user-web && npm run build

# 4. Run backend
cd src/backend && npm run dev

# 5. Test upload flow
curl -X POST http://localhost:3000/api/v1/incidents/{id}/media \
  -H "Authorization: Bearer <token>" \
  -F "file=@test.jpg"
```

### 10.2 Manual Test Cases

| # | Test | Expected |
|---|------|----------|
| 1 | Upload JPG to incident | Returns 200, file saved as WebP, thumbnail generated, DB row created |
| 2 | Upload PNG | Same as #1 |
| 3 | Upload MP4 video | Returns 200, file stored as-is, DB row created |
| 4 | Upload unsupported type (PDF) | Returns 400, validation error |
| 5 | Upload 60MB file | Returns 413, Multer rejects |
| 6 | GET /uploads/incidents/{id}/{name}.webp | Returns image, served by Express static |
| 7 | Delete media | File deleted from disk, DB row deleted |
| 8 | Gallery displays thumbnails | Thumbnails load, clicking opens lightbox |
| 9 | Lightbox navigation | Arrow keys work, Escape closes, count shown |

### 10.3 Commit

```
feat: add local media upload with Sharp compression, thumbnail generation, and gallery viewer
```

---

## Production Migration — Phase A: Cloudflare Account + R2 Bucket

### A.1 Create Cloudflare Account

1. Go to https://dash.cloudflare.com/sign-up
2. Sign up with email
3. Verify email

### A.2 Create R2 Bucket

1. In Cloudflare dashboard → R2 Object Storage
2. Click "Create bucket"
3. Name: `geowatch-media`
4. Location: Choose nearest region (default is fine)
5. Click "Create"

### A.3 Create R2 API Token

1. R2 → Manage R2 API Tokens
2. Click "Create API token"
3. Name: `geowatch-backend`
4. Permissions: **Object Read & Write**
5. Bucket: `geowatch-media` only
6. TTL: No expiration (or set to 1 year)
7. Click "Create API Token"
8. **SAVE the Token Value and Access Key ID** — shown only once

### A.4 Get S3-Compatible Endpoint

1. In R2 bucket page, click "Settings"
2. Copy the **S3 API** endpoint URL (looks like `https://{account-id}.r2.cloudflarestorage.com`)
3. Also note the **Jurisdiction-specific endpoint** if you chose EU jurisdiction

### A.5 Allow Public Access (for serving files)

1. R2 bucket → Settings
2. Scroll to "Public Access"
3. Click "Allow Public Access"
4. Note the **Public Bucket URL** (looks like `https://pub-{hash}.r2.dev`)
5. Optional: Set up custom domain (Phase D)

### A.6 What You Need for Phase B

| Value | Source |
|-------|--------|
| `R2_ENDPOINT` | S3 API endpoint from bucket settings |
| `R2_ACCESS_KEY_ID` | Created in A.3 |
| `R2_SECRET_ACCESS_KEY` | Created in A.3 |
| `R2_BUCKET` | `geowatch-media` |
| `R2_PUBLIC_URL` | Public bucket URL from A.5 |

---

## Production Migration — Phase B: R2 Storage Implementation

### B.1 Install AWS SDK v3

```bash
cd src/backend
npm install @aws-sdk/client-s3 @aws-sdk/s3-request-presigner
```

### B.2 Create `src/backend/src/storage/r2.storage.js`

```javascript
import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

const R2_ENDPOINT = process.env.R2_ENDPOINT;
const R2_ACCESS_KEY = process.env.R2_ACCESS_KEY_ID;
const R2_SECRET_KEY = process.env.R2_SECRET_ACCESS_KEY;
const R2_BUCKET = process.env.R2_BUCKET;
const R2_PUBLIC_URL = process.env.R2_PUBLIC_URL;

const s3 = new S3Client({
  region: 'auto',
  endpoint: R2_ENDPOINT,
  credentials: {
    accessKeyId: R2_ACCESS_KEY,
    secretAccessKey: R2_SECRET_KEY,
  },
});

export class R2Storage {
  async upload(buffer, filename, contentType) {
    const command = new PutObjectCommand({
      Bucket: R2_BUCKET,
      Key: filename,
      Body: buffer,
      ContentType: contentType,
    });
    await s3.send(command);
    return `${R2_PUBLIC_URL}/${filename}`;
  }

  getUrl(filename) {
    return `${R2_PUBLIC_URL}/${filename}`;
  }

  async delete(filename) {
    const command = new DeleteObjectCommand({
      Bucket: R2_BUCKET,
      Key: filename,
    });
    await s3.send(command);
  }
}
```

### B.3 Update Storage Factory

In `src/backend/src/storage/index.js`, uncomment the R2 line:

```javascript
import { LocalStorage } from './local.storage.js';
import { R2Storage } from './r2.storage.js';

const PROVIDER = process.env.STORAGE_PROVIDER || 'local';

export function getStorageEngine() {
  switch (PROVIDER) {
    case 'local':
      return new LocalStorage();
    case 'r2':
      return new R2Storage();
    default:
      throw new Error(`Unknown storage provider: ${PROVIDER}`);
  }
}

export { LocalStorage, R2Storage };
```

### B.4 Handle URL-to-Path Conversion for Deletes

In `media.controller.js`, the `deleteMedia` function extracts the relative path from a URL. For R2, the URL is `https://pub-xxx.r2.dev/incidents/{id}/{name}`. The relative path is everything after the domain: `incidents/{id}/{name}`.

The existing code uses `new URL().pathname` which already handles this correctly:
- Local: `http://localhost:3000/uploads/incidents/{id}/{name}` → pathname: `/uploads/incidents/{id}/{name}` → after replace: `incidents/{id}/{name}`
- R2: `https://pub-xxx.r2.dev/incidents/{id}/{name}` → pathname: `/incidents/{id}/{name}` → after replace: `incidents/{id}/{name}`

**BUT WAIT:** The current replace is `urlPath.replace('/uploads/', '')`. For R2, there's no `/uploads/` prefix. Fix the delete logic:

```javascript
// In deleteMedia controller, replace the path extraction with:
const urlPath = new URL(record.file_url).pathname;
// Remove leading slash
const relativePath = urlPath.replace(/^\//, '');
await storage.delete(relativePath);
```

This works for BOTH local and R2:
- Local URL: `http://localhost:3000/uploads/incidents/abc/file.webp` → pathname: `/uploads/incidents/abc/file.webp` → after replace: `uploads/incidents/abc/file.webp`

Hmm wait, for local storage the key passed to `upload()` was `incidents/{id}/{name}` and `getUrl()` prepended the base URL. So the full URL is `http://localhost:3000/uploads/incidents/{id}/{name}`. The pathname is `/uploads/incidents/{id}/{name}`. For local delete, we need `incidents/{id}/{name}` (what was passed to upload).

For R2, the key is also `incidents/{id}/{name}` and the URL is `https://pub-xxx.r2.dev/incidents/{id}/{name}`. The pathname is `/incidents/{id}/{name}`. So for R2 we need `incidents/{id}/{name}`.

The difference: local has `/uploads/` prefix in the pathname, R2 does not.

**Fix:** Store the `stored_path` (relative key) in the database alongside the URL, and use that for deletions. OR make the storage engine's `delete()` method smart enough to handle full URLs.

**Better approach:** Update the storage interface to accept full URLs in `delete()`:

```javascript
// In LocalStorage:
async delete(urlOrPath) {
  // If it's a full URL, extract the path part
  let relativePath = urlOrPath;
  if (urlOrPath.startsWith('http')) {
    const pathname = new URL(urlOrPath).pathname;
    relativePath = pathname.replace('/uploads/', '');
  }
  const filePath = join(this.baseDir, relativePath);
  // ...unlink
}

// In R2Storage:
async delete(urlOrPath) {
  let key = urlOrPath;
  if (urlOrPath.startsWith('http')) {
    const url = new URL(urlOrPath);
    key = url.pathname.replace(/^\//, '');
  }
  const command = new DeleteObjectCommand({ Bucket: R2_BUCKET, Key: key });
  await s3.send(command);
}
```

Then in the controller, just pass the full URL:
```javascript
await storage.delete(record.file_url);
await storage.delete(record.thumbnail_url);
```

This is cleaner. Document this in the plan.

### B.5 Document This Fix in the Plan

Update Phase 2 and Phase 4 to use full URLs in delete calls, and update both storage engines to parse URLs.

---

## Production Migration — Phase C: Env Switch + Testing

### C.1 Update Production Environment Variables

Create/edit `src/backend/.env.production`:

```bash
NODE_ENV=production
PORT=3000

# ... existing vars ...

# Storage
STORAGE_PROVIDER=r2
UPLOAD_DIR=./uploads

# R2 Config
R2_BUCKET=geowatch-media
R2_ENDPOINT=https://{account-id}.r2.cloudflarestorage.com
R2_ACCESS_KEY_ID=your_access_key
R2_SECRET_ACCESS_KEY=your_secret_key
R2_PUBLIC_URL=https://pub-{hash}.r2.dev
```

### C.2 Deploy

```bash
# 1. Install deps on server (includes @aws-sdk/*)
npm install

# 2. Start with production env
NODE_ENV=production npm start
```

### C.3 Test Production Upload Flow

1. Log in to admin dashboard
2. Open an incident
3. Upload an image
4. Verify:
   - Image appears in gallery
   - Thumbnail loads
   - Full image URL points to `pub-xxx.r2.dev`
   - Lightbox works
   - Delete removes from R2 and DB

### C.4 Cost Check

After first month, check Cloudflare R2 billing:
- Storage: should be under 10GB (free)
- Operations: should be under 1M Class A + 10M Class B (free)
- Egress: $0 (always free)

**Expected cost for first year: $0** if under free tier limits.

---

## Production Migration — Phase D: CDN Custom Domain (Optional)

### D.1 Add Custom Domain to R2 Bucket

Instead of `pub-xxx.r2.dev`, serve from `media.geowatch.app`:

1. Cloudflare dashboard → R2 → `geowatch-media` bucket
2. Settings → Public Access → Custom Domain
3. Click "Connect Domain"
4. Enter: `media.geowatch.app`
5. Cloudflare automatically creates the DNS record
6. Wait for SSL certificate provisioning (~1 minute)

### D.2 Update `R2_PUBLIC_URL`

```bash
R2_PUBLIC_URL=https://media.geowatch.app
```

### D.3 Update Existing Records (Migration)

If you have existing media with old `pub-xxx.r2.dev` URLs, run a DB update:

```sql
UPDATE incident_media
SET file_url = REPLACE(file_url, 'https://pub-xxx.r2.dev', 'https://media.geowatch.app'),
    thumbnail_url = REPLACE(thumbnail_url, 'https://pub-xxx.r2.dev', 'https://media.geowatch.app');
```

### D.4 Benefits

- Branded URLs (`media.geowatch.app/incidents/...`)
- Better caching control
- Easier to switch providers later (just CNAME)
- Professional appearance

---

## Appendix A — File Structure

After full implementation:

```
src/
├── backend/
│   ├── server.js                          # ← + static file serving, + media routes
│   ├── src/
│   │   ├── storage/
│   │   │   ├── index.js                   # Storage factory
│   │   │   ├── local.storage.js           # Local disk engine
│   │   │   └── r2.storage.js              # Cloudflare R2 engine (Phase B)
│   │   ├── utils/
│   │   │   ├── image-processor.js         # Sharp compression pipeline
│   │   │   └── video-processor.js         # FFmpeg placeholder (Phase 9)
│   │   ├── services/
│   │   │   └── media.service.js           # DB queries for incident_media
│   │   ├── controllers/
│   │   │   └── media.controller.js        # Upload/list/delete/reorder
│   │   ├── routes/
│   │   │   └── media.routes.js            # Multer + auth + routes
│   │   └── validators/
│   │       └── media.schema.js            # Zod schemas
│   └── package.json                       # + multer, sharp, @aws-sdk/*
├── admin-web/
│   └── src/
│       ├── components/
│       │   └── Media/
│       │       ├── MediaUploader.jsx      # Drag-drop upload
│       │       ├── MediaGallery.jsx       # Thumbnail grid
│       │       └── MediaLightbox.jsx      # Full-screen viewer
│       └── services/api.js                # + uploadMedia, listMedia, deleteMedia
├── user-web/
│   └── src/
│       └── components/                    # Copy MediaGallery here for public view
└── shared/
    └── components/                         # (optional) move Media components here
```

---

## Appendix B — Environment Variables

### Development

```bash
# Storage
STORAGE_PROVIDER=local
UPLOAD_DIR=./uploads

# R2 (not used in dev, but document for reference)
# R2_BUCKET=geowatch-media
# R2_ENDPOINT=https://{account}.r2.cloudflarestorage.com
# R2_ACCESS_KEY_ID=...
# R2_SECRET_ACCESS_KEY=...
# R2_PUBLIC_URL=https://pub-xxx.r2.dev
```

### Production

```bash
STORAGE_PROVIDER=r2
UPLOAD_DIR=./uploads

R2_BUCKET=geowatch-media
R2_ENDPOINT=https://{account}.r2.cloudflarestorage.com
R2_ACCESS_KEY_ID=...
R2_SECRET_ACCESS_KEY=...
R2_PUBLIC_URL=https://media.geowatch.app
```

---

## Appendix C — Sharp Configuration Reference

| Parameter | Value | Description |
|-----------|-------|-------------|
| `MAX_IMAGE_WIDTH` | 1920 | Max width before downscaling |
| `MAX_IMAGE_HEIGHT` | 1080 | Max height before downscaling |
| `THUMB_WIDTH` | 300 | Thumbnail width |
| `THUMB_HEIGHT` | 200 | Thumbnail height |
| `WEBP_QUALITY` | 80 | WebP quality (0-100) |
| `webp.effort` | 4 | Compression effort (0-6, higher = smaller file, slower) |
| `fit: 'inside'` | — | Preserve aspect ratio, fit within bounds |
| `fit: 'cover'` | — | Crop to fill bounds (for thumbnails) |
| `position: 'attention'` | — | Smart crop to interesting area |
| `limitInputPixels` | 268,402,689 | Max input resolution (~16K²) |
| `failOnError: false` | — | Skip corrupted pixels, don't crash |

---

## Appendix D — Common Issues

| Issue | Cause | Fix |
|-------|-------|-----|
| Multer rejects file | Mime type not in allowed list | Add mime type to `fileFilter` array |
| Sharp crashes on large image | Image exceeds `limitInputPixels` | Increase limit or reject oversized images |
| Thumbnails not generating | Sharp not installed | `npm install sharp` |
| Uploaded file 404 | Express static not mounted | Check `server.js` static middleware |
| CORS on uploaded image | Static middleware before CORS | Move CORS middleware BEFORE static, or add `credentials: true` to static |
| Memory leak on many uploads | Multer `memoryStorage` | For very large files, use `diskStorage` temporarily, then process |
| R2 upload fails | Wrong endpoint or credentials | Verify `R2_ENDPOINT` includes `https://` |
| R2 delete fails | URL parsing wrong | Ensure `delete()` handles both full URLs and relative paths |
| Video won't play in browser | Wrong codec (e.g., H.265) | Only accept H.264 MP4 for maximum compatibility |
| Frontend shows broken image | URL is relative, not absolute | Ensure backend returns full URLs, not paths |

---

## Quick Reference: Phase Commands

```bash
# Phase 1: Run migration
sudo -u postgres psql -d geowatch_dev -f docs/media-migration.sql

# Phase 2-3: Install deps
cd src/backend && npm install multer sharp

# Phase B: Install AWS SDK (production only)
cd src/backend && npm install @aws-sdk/client-s3 @aws-sdk/s3-request-presigner

# Phase 10: Build all
npm run build:admin-web && npm run build:user-web && npm run build:backend

# Test upload
curl -X POST http://localhost:3000/api/v1/incidents/{id}/media \
  -H "Authorization: Bearer <token>" \
  -F "file=@test.jpg"
```

---

*Plan version: 1.0*
*Created: 2026-05-05*
*Next step: User says "Start Phase X" → implement that phase only.*
