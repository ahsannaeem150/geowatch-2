import { ZodError } from 'zod';

/**
 * Validates request body, query, or params against a Zod schema.
 * @param {z.ZodSchema} schema - Zod schema to validate against
 * @param {string} source - 'body' | 'query' | 'params'
 */
export function validateRequest(schema, source = 'body') {
  return (req, res, next) => {
    try {
      const result = schema.parse(req[source]);
      // Replace with parsed/coerced values
      req[source] = result;
      next();
    } catch (err) {
      if (err instanceof ZodError) {
        err.name = 'ZodError';
      }
      next(err);
    }
  };
}
