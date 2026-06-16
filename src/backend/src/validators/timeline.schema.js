import { z } from 'zod';

export const createTimelineSchema = z.object({
  summary: z.string().min(1).max(5000),
  updateDate: z.string().datetime().optional(),
  sourceUrl: z.string().url().optional(),
  type: z.enum(['report', 'update']).optional(),
  verificationStatus: z.enum(['unverified', 'verified', 'disputed', 'debunked']).optional(),
});

export const updateTimelineSchema = z.object({
  summary: z.string().min(1).max(5000).optional(),
  updateDate: z.string().datetime().optional(),
  sourceUrl: z.string().url().optional().nullable(),
  type: z.enum(['report', 'update']).optional(),
  verificationStatus: z.enum(['unverified', 'verified', 'disputed', 'debunked']).optional(),
});

export const setFeaturedSchema = z.object({
  sourceType: z.enum(['media', 'x_post', 'news_article', 'admin_note']),
  sourceId: z.string().uuid().optional(),
  mediaId: z.string().uuid().optional(),
}).refine(
  (data) => {
    if (data.sourceType === 'media') return !!data.mediaId;
    return !!data.sourceId;
  },
  { message: 'mediaId is required when sourceType is media; sourceId is required otherwise' }
);
