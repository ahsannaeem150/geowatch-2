// Taxonomy endpoints — incident categories/domains and zone categories.
// Used by the directory filter drawers (P6).

import { api } from './api';

// GET /categories — every incident category, each carrying
// domain_id/domain_name/domain_slug/domain_color.
export function listCategories() {
  return api.get('/categories');
}

// GET /zone-categories — { id, name, slug, color, icon }.
export function listZoneCategories() {
  return api.get('/zone-categories');
}
