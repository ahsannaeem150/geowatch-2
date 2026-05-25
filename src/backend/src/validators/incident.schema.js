import { z } from 'zod';

export const createIncidentSchema = z.object({
  title: z.string().min(1).max(500),
  description: z.string().optional(),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  categoryId: z.number().int().positive(),
  severity: z.number().int().min(1).max(5),
  startDate: z.string().datetime(),
  endDate: z.string().datetime().optional().nullable(),
  locationContext: z.string().max(255).optional(),
  sources: z.array(
    z.object({
      sourceType: z.enum(['x_post', 'news_article', 'image', 'video', 'admin_note']),
      sourceUrl: z.string().url().optional(),
      description: z.string().optional(),
    })
  ).optional(),
});

export const updateIncidentSchema = z.object({
  title: z.string().min(1).max(500).optional(),
  description: z.string().optional(),
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),
  categoryId: z.number().int().positive().optional(),
  severity: z.number().int().min(1).max(5).optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional().nullable(),
});

export const listIncidentsQuerySchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  dateFrom: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  dateTo: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  categoryId: z.coerce.number().int().positive().optional(),
  severity: z.coerce.number().int().min(1).max(5).optional(),
  status: z.enum(['active', 'resolved']).optional(),
  viewport: z.string().regex(/^-?\d+\.?\d*,-?\d+\.?\d*,-?\d+\.?\d*,-?\d+\.?\d*$/).optional(),
});

export const searchIncidentsQuerySchema = z.object({
  q: z.string().min(1).max(200),
  dateFrom: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  dateTo: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  categoryId: z.coerce.number().int().positive().optional(),
  severity: z.coerce.number().int().min(1).max(5).optional(),
  status: z.enum(['active', 'resolved']).optional(),
  viewport: z.string().regex(/^-?\d+\.?\d*,-?\d+\.?\d*,-?\d+\.?\d*,-?\d+\.?\d*$/).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(25),
  offset: z.coerce.number().int().min(0).default(0),
});
