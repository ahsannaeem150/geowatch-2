import { z } from 'zod';

export const geocodeSearchQuerySchema = z.object({
  q: z.string().trim().min(2).max(200),
});
