import { Router } from 'express';
import { asyncHandler } from '../utils/async-handler.js';
import { validateRequest } from '../middleware/validate-request.js';
import { mediaProxyQuerySchema } from '../validators/media-proxy.schema.js';
import { proxyTwitterVideoController } from '../controllers/media-proxy.controller.js';

const router = Router();

router.get(
  '/video',
  validateRequest(mediaProxyQuerySchema, 'query'),
  asyncHandler(proxyTwitterVideoController),
);

export default router;
