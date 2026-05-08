import { z } from 'zod';

export const createTimelineSchema = z.object({
  summary: z.string().min(1).max(5000),
  updateDate: z.string().datetime().optional(),
  sourceUrl: z.string().url().optional(),
});

export const updateTimelineSchema = z.object({
  summary: z.string().min(1).max(5000).optional(),
  updateDate: z.string().datetime().optional(),
  sourceUrl: z.string().url().optional().nullable(),
});
