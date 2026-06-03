import { z } from 'zod';

// ─── GeoJSON Polygon Coordinate Array ───
// [[[lng, lat], [lng, lat], ..., [lng, lat]]] — last must equal first (closed)
const geoJsonPolygonSchema = z.object({
  type: z.literal('Polygon'),
  coordinates: z.array(
    z.array(z.tuple([z.number().min(-180).max(180), z.number().min(-90).max(90)])).min(4)
  ).min(1),
});

export const createZoneSchema = z.object({
  name: z.string().min(1).max(255),
  geometry: geoJsonPolygonSchema,
  description: z.string().optional(),
  fillColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
  strokeColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
  strokeWidth: z.number().int().min(1).max(10).optional(),
  opacity: z.number().min(0).max(1).optional(),
  category: z.string().max(50).optional(),
});

export const updateZoneSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  geometry: geoJsonPolygonSchema.optional(),
  description: z.string().optional(),
  fillColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
  strokeColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
  strokeWidth: z.number().int().min(1).max(10).optional(),
  opacity: z.number().min(0).max(1).optional(),
  category: z.string().max(50).optional(),
  isActive: z.boolean().optional(),
}).refine(
  (data) => Object.keys(data).length > 0,
  { message: 'At least one field must be provided for update' }
);
