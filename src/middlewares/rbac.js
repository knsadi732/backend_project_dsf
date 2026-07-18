const AppError = require('../utils/AppError');
const asyncHandler = require('../utils/asyncHandler');
const rbacService = require('../services/rbac.service');

/**
 * Route-level permission gate (plan.md Service-01 pipeline: Role -> Permission
 * -> Route -> Tenant). Centralizes the check here instead of scattering role
 * string comparisons across controllers.
 * Must run after `authenticate`.
 */
function requirePermission(permissionKey) {
  return asyncHandler(async (req, res, next) => {
    const granted = await rbacService.hasPermission(req.user.id, permissionKey);
    if (!granted) {
      throw new AppError('AUTH_002');
    }
    next();
  });
}

module.exports = { requirePermission };
