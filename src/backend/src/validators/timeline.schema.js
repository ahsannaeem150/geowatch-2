import { z } from 'zod';

export const createTimelineSchema = z.object({
  summary: z.string().min(1).max(5000),
  updateDate: z.string().datetime().optional(),
});
