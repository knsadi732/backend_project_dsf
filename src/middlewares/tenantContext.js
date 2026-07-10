const AppError = require('../utils/AppError');

/**
 * Derives req.tenant strictly from the authenticated session (req.user),
 * never from client-supplied headers/query/body. Repositories must filter
 * every tenant-scoped query by these ids (plan.md Chapter 5).
 * Must run after `authenticate`.
 */
function tenantContext(req, res, next) {
  if (!req.user || !req.user.companyId) {
    throw new AppError('USER_001');
  }

  req.tenant = {
    companyId: req.user.companyId,
    branchId: req.user.branchId,
    warehouseId: req.user.warehouseId,
  };

  next();
}

module.exports = tenantContext;
