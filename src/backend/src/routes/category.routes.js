import { Router } from 'express';
import { asyncHandler } from '../utils/async-handler.js';
import {
  getDomainsController,
  getDomainController,
  getAllCategoriesController,
} from '../controllers/category.controller.js';

const router = Router();

router.get('/domains', asyncHandler(getDomainsController));
router.get('/domains/:slug', asyncHandler(getDomainController));
router.get('/', asyncHandler(getAllCategoriesController));

export default router;
