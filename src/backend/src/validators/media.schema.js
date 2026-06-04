import { z } from 'zod';

export const uploadMediaSchema = z.object({
  // Multer handles the file; we only validate non-file params here
  // This schema is mostly a placeholder for route validation middleware
});

export const reorderMediaSchema = z.object({
  displayOrder: z.number().int().min(0),
});
