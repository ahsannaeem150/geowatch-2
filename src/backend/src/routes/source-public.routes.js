import { Router } from 'express';
import { asyncHandler } from '../utils/async-handler.js';
import { checkPublicSourceController } from '../controllers/source.controller.js';

const router = Router({ mergeParams: true });

// Public availability check for X-post sources. Used by the public user web
// frontend to lazily archive deleted/unavailable posts on expand.
router.post(
  '/:sourceId/check',
  asyncHandler(checkPublicSourceController)
);

export default router;
