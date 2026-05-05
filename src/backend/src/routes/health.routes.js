import { Router } from 'express';
import { asyncHandler } from '../utils/async-handler.js';

const router = Router();

router.get(
  '/health',
  asyncHandler(async (req, res) => {
    res.apiSuccess({ status: 'ok', timestamp: new Date().toISOString() });
  })
);

export default router;
