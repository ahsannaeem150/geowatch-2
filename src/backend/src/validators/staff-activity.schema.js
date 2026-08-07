import { z } from 'zod';

export const listStaffActivityQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(50),
});
