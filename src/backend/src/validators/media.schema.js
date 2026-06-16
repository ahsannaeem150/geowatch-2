import { z } from 'zod';

export const uploadMediaSchema = z.object({
  // Multer handles the file; text fields are validated in the controller
});

export const updateMediaSchema = z.object({
  updateId: z.string().uuid().optional(),
  caption: z.string().max(2000).optional().nullable(),
  pinned: z.boolean().optional(),
}).refine(
  (data) => Object.keys(data).length > 0,
  { message: 'At least one field (updateId, caption, or pinned) is required' }
);

export const pinMediaSchema = z.object({
  pinned: z.boolean(),
});

export const reorderMediaSchema = z.object({
  displayOrder: z.number().int().min(0),
});
