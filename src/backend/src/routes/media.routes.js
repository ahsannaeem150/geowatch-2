import { Router } from 'express';
import multer from 'multer';
import {
  uploadMedia,
  listMedia,
  deleteMedia,
  updateMedia,
  pinMedia,
  reorderMedia,
} from '../controllers/media.controller.js';
import { asyncHandler } from '../utils/async-handler.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { requireRole } from '../middleware/role.middleware.js';
import { validateRequest } from '../middleware/validate-request.js';
import { updateMediaSchema, pinMediaSchema, reorderMediaSchema } from '../validators/media.schema.js';

const router = Router({ mergeParams: true });

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
    // Reject unsupported types silently — controller returns 400 with a clear message
    cb(null, allowed.includes(file.mimetype));
  },
});

// Routes
router.get('/', asyncHandler(listMedia));
router.post(
  '/',
  authenticate,
  requireRole(['admin', 'super_admin']),
  upload.single('file'),
  asyncHandler(uploadMedia)
);
router.delete(
  '/:mediaId',
  authenticate,
  requireRole(['admin', 'super_admin']),
  asyncHandler(deleteMedia)
);
router.patch(
  '/:mediaId',
  authenticate,
  requireRole(['admin', 'super_admin']),
  validateRequest(updateMediaSchema, 'body'),
  asyncHandler(updateMedia)
);
router.patch(
  '/:mediaId/pin',
  authenticate,
  requireRole(['admin', 'super_admin']),
  validateRequest(pinMediaSchema, 'body'),
  asyncHandler(pinMedia)
);
router.patch(
  '/:mediaId/order',
  authenticate,
  requireRole(['admin', 'super_admin']),
  validateRequest(reorderMediaSchema),
  asyncHandler(reorderMedia)
);

export default router;
