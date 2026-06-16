import { z } from 'zod';

const sourceTypeEnum = z.enum(['x_post', 'news_article', 'image', 'video', 'admin_note']);
const verificationStatusEnum = z.enum(['unverified', 'verified', 'disputed', 'debunked']);

export const createSourceSchema = z.object({
  updateId: z.string().uuid(),
  sourceType: sourceTypeEnum,
  sourceUrl: z.string().url().optional(),
  description: z.string().optional(),
  displayOrder: z.number().int().min(0).optional(),
  verificationStatus: verificationStatusEnum.optional(),
});

export const updateSourceSchema = z.object({
  updateId: z.string().uuid().optional(),
  sourceUrl: z.string().url().optional().nullable(),
  description: z.string().optional().nullable(),
  displayOrder: z.number().int().min(0).optional(),
  verificationStatus: verificationStatusEnum.optional(),
  archived: z.boolean().optional(),
  archiveMediaId: z.string().uuid().optional().nullable(),
  archiveReason: z.string().optional().nullable(),
}).refine(
  (data) => {
    if (data.archived === true && !data.archiveMediaId) {
      return false;
    }
    return true;
  },
  { message: 'archiveMediaId is required when archiving a source' }
);

export const updateSourceVerificationSchema = z.object({
  verificationStatus: verificationStatusEnum,
});

export const pinSourceSchema = z.object({
  pinned: z.boolean(),
});
