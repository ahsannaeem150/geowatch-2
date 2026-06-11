import { z } from 'zod';

// ─── GeoJSON Geometry Schemas ───
const geoJsonPointSchema = z.object({
  type: z.literal('Point'),
  coordinates: z.tuple([z.number().min(-180).max(180), z.number().min(-90).max(90)]),
});

const geoJsonPolygonSchema = z.object({
  type: z.literal('Polygon'),
  coordinates: z.array(
    z.array(z.tuple([z.number().min(-180).max(180), z.number().min(-90).max(90)])).min(4)
  ).min(1),
});

const geoJsonGeometrySchema = z.union([geoJsonPointSchema, geoJsonPolygonSchema]);

// ─── Helpers ───
function inferGeometryType(data) {
  if (data.geometryType) return data.geometryType;
  if (data.geometry?.type === 'Polygon') return 'polygon';
  if (data.geometry?.type === 'Point') return 'point';
  if (data.latitude !== undefined && data.longitude !== undefined) return 'point';
  return undefined;
}

// ─── Create Incident ───
export const createIncidentSchema = z.object({
  title: z.string().min(1).max(500),
  description: z.string().optional(),
  geometryType: z.enum(['point', 'polygon']).optional(),
  geometry: geoJsonGeometrySchema.optional(),
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),
  categoryId: z.number().int().positive().optional(),
  zoneCategoryId: z.number().int().positive().optional(),
  severity: z.number().int().min(1).max(5),
  startDate: z.string().datetime(),
  endDate: z.string().datetime().optional().nullable(),
  locationContext: z.string().max(255).optional(),
  verificationOverride: z.enum(['unverified', 'verified', 'confirmed', 'contested']).optional().nullable(),
  sources: z.array(
    z.object({
      sourceType: z.enum(['x_post', 'news_article', 'image', 'video', 'admin_note']),
      sourceUrl: z.string().url().optional(),
      description: z.string().optional(),
      verificationStatus: z.enum(['unverified', 'verified', 'disputed', 'debunked']).optional(),
    })
  ).optional(),
}).refine(
  (data) => {
    const type = inferGeometryType(data);
    return type === 'point' || type === 'polygon';
  },
  { message: 'Must provide either (latitude + longitude) or a GeoJSON geometry' }
).refine(
  (data) => {
    const type = inferGeometryType(data);
    if (type === 'polygon') return data.geometry?.type === 'Polygon';
    return true;
  },
  { message: 'Polygon incidents require a GeoJSON Polygon geometry' }
).refine(
  (data) => {
    const type = inferGeometryType(data);
    if (type === 'point') {
      return data.latitude !== undefined && data.longitude !== undefined;
    }
    return true;
  },
  { message: 'Point incidents require latitude and longitude' }
).refine(
  (data) => {
    if (data.geometry?.type === 'Polygon') {
      const ring = data.geometry.coordinates[0];
      const first = ring[0];
      const last = ring[ring.length - 1];
      return first[0] === last[0] && first[1] === last[1];
    }
    return true;
  },
  { message: 'Polygon ring must be closed (first coordinate equals last)' }
).transform((data) => ({
  ...data,
  geometryType: inferGeometryType(data),
}));

// ─── Update Incident ───
export const updateIncidentSchema = z.object({
  title: z.string().min(1).max(500).optional(),
  description: z.string().optional(),
  geometryType: z.enum(['point', 'polygon']).optional(),
  geometry: geoJsonGeometrySchema.optional(),
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),
  categoryId: z.number().int().positive().optional(),
  severity: z.number().int().min(1).max(5).optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional().nullable(),
  locationContext: z.string().max(255).optional(),
  verificationOverride: z.enum(['unverified', 'verified', 'confirmed', 'contested']).optional().nullable(),
}).refine(
  (data) => {
    if (data.geometryType === 'polygon' && data.geometry?.type !== 'Polygon') {
      return false;
    }
    if (data.geometryType === 'point' && (data.latitude === undefined || data.longitude === undefined)) {
      return false;
    }
    return true;
  },
  { message: 'geometryType, geometry, latitude, and longitude must be consistent' }
).refine(
  (data) => {
    if (data.geometry?.type === 'Polygon') {
      const ring = data.geometry.coordinates[0];
      const first = ring[0];
      const last = ring[ring.length - 1];
      return first[0] === last[0] && first[1] === last[1];
    }
    return true;
  },
  { message: 'Polygon ring must be closed' }
).refine(
  (data) => Object.keys(data).length > 0,
  { message: 'At least one field must be provided for update' }
);

// ─── Query Schemas ───
export const listIncidentsQuerySchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  dateFrom: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  dateTo: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  categoryId: z.coerce.number().int().positive().optional(),
  severity: z.coerce.number().int().min(1).max(5).optional(),
  status: z.enum(['active', 'resolved']).optional(),
  viewport: z.string().regex(/^-?\d+\.?\d*,-?\d+\.?\d*,-?\d+\.?\d*,-?\d+\.?\d*$/).optional(),
  geometryType: z.enum(['point', 'polygon']).optional(),
});

export const searchIncidentsQuerySchema = z.object({
  q: z.string().min(1).max(200),
  dateFrom: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  dateTo: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  categoryId: z.coerce.number().int().positive().optional(),
  severity: z.coerce.number().int().min(1).max(5).optional(),
  status: z.enum(['active', 'resolved']).optional(),
  viewport: z.string().regex(/^-?\d+\.?\d*,-?\d+\.?\d*,-?\d+\.?\d*,-?\d+\.?\d*$/).optional(),
  geometryType: z.enum(['point', 'polygon']).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(25),
  offset: z.coerce.number().int().min(0).default(0),
});
