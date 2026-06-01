import { z } from 'zod';

export const listUsersQuerySchema = z.object({
  search: z.string().optional(),
  role: z.enum(['super_admin', 'admin']).optional(),
  isActive: z.enum(['true', 'false']).optional().transform((val) => {
    if (val === undefined) return undefined;
    return val === 'true';
  }),
  sortBy: z.enum(['created_at', 'last_login_at', 'email', 'full_name']).optional().default('created_at'),
  sortOrder: z.enum(['asc', 'desc']).optional().default('desc'),
  page: z.coerce.number().min(1).optional().default(1),
  limit: z.coerce.number().min(1).max(100).optional().default(25),
});

export const updateUserBodySchema = z.object({
  role: z.enum(['super_admin', 'admin']).optional(),
  isActive: z.boolean().optional(),
  fullName: z.string().min(2, 'Full name must be at least 2 characters').max(255, 'Full name too long').optional(),
}).refine((data) => Object.keys(data).length > 0, {
  message: 'At least one field must be provided',
});
