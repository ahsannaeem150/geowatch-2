import { z } from 'zod';

export const createSourceSchema = z.object({
  sourceType: z.enum(['x_post', 'news_article', 'image', 'video', 'admin_note']),
  sourceUrl: z.string().url().optional(),
  description: z.string().optional(),
  displayOrder: z.number().int().min(0).optional(),
  verificationStatus: z.enum(['unverified', 'verified', 'disputed', 'debunked']).optional(),
});

export const updateSourceVerificationSchema = z.object({
  verificationStatus: z.enum(['unverified', 'verified', 'disputed', 'debunked']),
});
