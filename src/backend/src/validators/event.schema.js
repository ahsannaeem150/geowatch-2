import { z } from 'zod';

export const createEventSchema = z.object({
  title: z.string().min(1).max(500),
  description: z.string().optional(),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  category: z.enum(['conflict', 'protest', 'disaster', 'diplomacy', 'humanitarian', 'other']),
  severity: z.number().int().min(1).max(5),
  startDate: z.string().datetime(),
  endDate: z.string().datetime().optional().nullable(),
  sources: z.array(
    z.object({
      sourceType: z.enum(['x_post', 'news_article', 'image', 'video', 'admin_note']),
      sourceUrl: z.string().url().optional(),
      description: z.string().optional(),
    })
  ).optional(),
});

export const updateEventSchema = z.object({
  title: z.string().min(1).max(500).optional(),
  description: z.string().optional(),
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),
  category: z.enum(['conflict', 'protest', 'disaster', 'diplomacy', 'humanitarian', 'other']).optional(),
  severity: z.number().int().min(1).max(5).optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional().nullable(),
});

export const listEventsQuerySchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  dateFrom: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  dateTo: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  category: z.enum(['conflict', 'protest', 'disaster', 'diplomacy', 'humanitarian', 'other']).optional(),
  severity: z.coerce.number().int().min(1).max(5).optional(),
  status: z.enum(['active', 'resolved']).optional(),
  viewport: z.string().regex(/^-?\d+\.?\d*,-?\d+\.?\d*,-?\d+\.?\d*,-?\d+\.?\d*$/).optional(),
});
