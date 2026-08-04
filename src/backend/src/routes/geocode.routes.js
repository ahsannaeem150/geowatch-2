import { Router } from 'express';
import { asyncHandler } from '../utils/async-handler.js';
import { validateRequest } from '../middleware/validate-request.js';
import { geocodeSearchQuerySchema } from '../validators/geocode.schema.js';
import { searchGeocodeController } from '../controllers/geocode.controller.js';

const router = Router();

// Public geocoding proxy (Nominatim) — cached server-side
router.get('/search', validateRequest(geocodeSearchQuerySchema, 'query'), asyncHandler(searchGeocodeController));

export default router;
