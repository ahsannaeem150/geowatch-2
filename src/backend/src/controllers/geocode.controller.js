import { searchGeocode } from '../services/geocode.service.js';

export async function searchGeocodeController(req, res) {
  const results = await searchGeocode(req.query.q);
  res.apiSuccess(results);
}
