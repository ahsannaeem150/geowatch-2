import { z } from 'zod';

function slugify(name) {
  return name.toLowerCase().trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .substring(0, 60);
}

// ─── Domain Schemas ───

export const createDomainSchema = z.object({
  name: z.string().min(1, 'Name is required').max(60, 'Name too long'),
  slug: z.string().min(1).max(60).regex(/^[a-z0-9-]+$/).optional(),
  description: z.string().max(500).optional(),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Color must be a valid hex code').optional().default('#6b7280'),
  icon: z.string().max(40).optional(),
  sortOrder: z.number().int().min(0).optional().default(0),
}).transform((data) => ({
  ...data,
  slug: data.slug || slugify(data.name),
}));

export const updateDomainSchema = z.object({
  name: z.string().min(1).max(60).optional(),
  slug: z.string().min(1).max(60).regex(/^[a-z0-9-]+$/).optional(),
  description: z.string().max(500).optional(),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
  icon: z.string().max(40).optional(),
  sortOrder: z.number().int().min(0).optional(),
  isActive: z.boolean().optional(),
}).refine((data) => Object.keys(data).length > 0, {
  message: 'At least one field must be provided',
});

// ─── Category Schemas ───

export const createCategorySchema = z.object({
  domainId: z.number().int().positive('Domain ID is required'),
  name: z.string().min(1, 'Name is required').max(60, 'Name too long'),
  slug: z.string().min(1).max(60).regex(/^[a-z0-9-]+$/).optional(),
  description: z.string().max(500).optional(),
  severitySchema: z.object({
    type: z.enum(['scale', 'enum']).optional(),
    levels: z.array(z.any()).optional(),
  }).optional().default({ type: 'scale', levels: [] }),
  defaultSeverity: z.string().max(20).optional(),
  requiresLocation: z.boolean().optional().default(true),
  requiresPhoto: z.boolean().optional().default(false),
  requiresVideo: z.boolean().optional().default(false),
  sortOrder: z.number().int().min(0).optional().default(0),
}).transform((data) => ({
  ...data,
  slug: data.slug || slugify(data.name),
}));

export const updateCategorySchema = z.object({
  domainId: z.number().int().positive().optional(),
  name: z.string().min(1).max(60).optional(),
  slug: z.string().min(1).max(60).regex(/^[a-z0-9-]+$/).optional(),
  description: z.string().max(500).optional(),
  severitySchema: z.object({
    type: z.enum(['scale', 'enum']).optional(),
    levels: z.array(z.any()).optional(),
  }).optional(),
  defaultSeverity: z.string().max(20).optional(),
  requiresLocation: z.boolean().optional(),
  requiresPhoto: z.boolean().optional(),
  requiresVideo: z.boolean().optional(),
  sortOrder: z.number().int().min(0).optional(),
  isActive: z.boolean().optional(),
}).refine((data) => Object.keys(data).length > 0, {
  message: 'At least one field must be provided',
});
