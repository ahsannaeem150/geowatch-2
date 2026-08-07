import { Router } from 'express';
import { getStats } from '../controllers/stats.controller.js';
import { asyncHandler } from '../utils/async-handler.js';

const router = Router();

router.get('/', asyncHandler(getStats));

export default router;
