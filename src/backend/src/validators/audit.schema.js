import { z } from 'zod';

export const listAuditQuerySchema = z.object({
  action: z.string().optional(),
  userId: z.string().uuid().optional(),
  targetType: z.string().optional(),
  targetId: z.string().optional(),
  relatedIncidentId: z.string().uuid().optional(),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
  realm: z.enum(['system', 'user']).optional(),
  actorType: z.enum(['staff', 'public_user']).optional(),
  page: z.coerce.number().min(1).optional().default(1),
  limit: z.coerce.number().min(1).max(500).optional().default(50),
});
