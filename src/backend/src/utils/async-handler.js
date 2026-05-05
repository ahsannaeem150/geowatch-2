/**
 * Wraps async route handlers so errors are passed to Express error middleware.
 * Eliminates try/catch boilerplate in every route handler.
 */
export function asyncHandler(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}
