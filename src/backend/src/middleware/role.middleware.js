/**
 * Restricts access to users with the specified role(s).
 * Must be used AFTER authenticate middleware.
 * @param {string | string[]} allowedRoles
 */
export function requireRole(allowedRoles) {
  const roles = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];

  return (req, res, next) => {
    if (!req.user) {
      return res.apiError('Authentication required', 'UNAUTHORIZED', 401);
    }

    if (!roles.includes(req.user.role)) {
      return res.apiError('Insufficient permissions', 'FORBIDDEN', 403);
    }

    next();
  };
}
