import { z } from 'zod';

export const listStaffRecentsQuerySchema = z.object({
  type: z.enum(['search', 'incident']),
  limit: z.coerce.number().int().min(1).max(100).default(50),
});

export const recordStaffRecentBodySchema = z.object({
  type: z.enum(['search', 'incident']),
  payload: z.record(z.any()).optional(),
});

export const clearStaffRecentsQuerySchema = z.object({
  type: z.enum(['search', 'incident']).optional(),
});
