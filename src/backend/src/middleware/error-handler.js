import { errorResponse } from '../utils/api-response.js';

/**
 * Centralized Express error handler.
 * Catches all errors thrown in async routes and middleware.
 * Must be registered LAST in the Express app.
 */
export function errorHandler(err, req, res, next) {
  console.error('Error:', err);

  // Zod validation errors
  if (err.name === 'ZodError' || err.issues) {
    const messages = err.issues?.map((i) => `${i.path.join('.')}: ${i.message}`).join(', ');
    return res.status(400).json(
      errorResponse(messages || 'Validation failed', 'VALIDATION_ERROR')
    );
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json(errorResponse('Invalid token', 'UNAUTHORIZED'));
  }
  if (err.name === 'TokenExpiredError') {
    return res.status(401).json(errorResponse('Token expired', 'UNAUTHORIZED'));
  }

  // PostgreSQL errors
  if (err.code === '23505') {
    return res.status(409).json(errorResponse('Resource already exists', 'CONFLICT'));
  }
  if (err.code === '23503') {
    return res.status(409).json(errorResponse('Referenced resource does not exist', 'CONFLICT'));
  }

  // Default server error
  const statusCode = err.statusCode || err.status || 500;
  const message = err.message || 'Internal server error';
  const errorCode = err.errorCode || 'SERVER_ERROR';

  return res.status(statusCode).json(errorResponse(message, errorCode));
}

/**
 * 404 handler for unmatched routes.
 */
export function notFoundHandler(req, res) {
  return res.status(404).json(errorResponse(`Route ${req.method} ${req.path} not found`, 'NOT_FOUND'));
}
