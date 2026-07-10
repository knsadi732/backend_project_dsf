const jwt = require('jsonwebtoken');
const env = require('../config/env');
const AppError = require('../utils/AppError');
const asyncHandler = require('../utils/asyncHandler');

/**
 * Verifies the access JWT and attaches the decoded claims to req.user.
 * Downstream middlewares (tenantContext, rbac) rely on req.user being
 * the sole source of tenant/role identity — never trust client-supplied
 * company/branch/warehouse ids instead (plan.md Chapter 5).
 */
const authenticate = asyncHandler(async (req, res, next) => {
  const header = req.headers.authorization || '';
  const [scheme, token] = header.split(' ');

  if (scheme !== 'Bearer' || !token) {
    throw new AppError('AUTH_004', [], 'Missing or malformed Authorization header.');
  }

  try {
    const payload = jwt.verify(token, env.auth.accessSecret);
    req.user = {
      id: payload.sub,
      companyId: payload.companyId,
      branchId: payload.branchId ?? null,
      warehouseId: payload.warehouseId ?? null,
      roleId: payload.roleId,
      roleKey: payload.roleKey,
    };
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      throw new AppError('AUTH_001');
    }
    throw new AppError('AUTH_004');
  }
});

module.exports = authenticate;
