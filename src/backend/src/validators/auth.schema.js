import { z } from 'zod';

export const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

export const registerSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  fullName: z.string().min(1, 'Full name is required').max(255, 'Full name too long'),
  role: z.enum(['super_admin', 'admin'], {
    errorMap: () => ({ message: 'Role must be super_admin or admin' }),
  }),
});

export const updateAdminSchema = z.object({
  role: z.enum(['super_admin', 'admin']).optional(),
  isActive: z.boolean().optional(),
}).refine((data) => data.role !== undefined || data.isActive !== undefined, {
  message: 'At least one field (role or isActive) must be provided',
});
