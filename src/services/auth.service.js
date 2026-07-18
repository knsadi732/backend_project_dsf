const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const crypto = require('crypto');

const env = require('../config/env');
const AppError = require('../utils/AppError');
const userRepository = require('../repositories/user.repository');
const roleRepository = require('../repositories/role.repository');
const sessionRepository = require('../repositories/session.repository');

/** Refresh tokens are high-entropy JWTs — a fast SHA-256 digest is sufficient
 * (and avoids bcrypt's cost factor) for the at-rest session lookup column. */
function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

function signAccessToken(user, roleKey) {
  return jwt.sign(
    {
      sub: user.id,
      companyId: user.company_id,
      branchId: user.branch_id,
      warehouseId: user.warehouse_id,
      roleId: user.role_id,
      roleKey,
    },
    env.auth.accessSecret,
    { expiresIn: env.auth.accessExpiresIn },
  );
}

async function issueSession(user, meta = {}) {
  const refreshToken = jwt.sign({ sub: user.id }, env.auth.refreshSecret, {
    expiresIn: env.auth.refreshExpiresIn,
  });
  const { exp } = jwt.decode(refreshToken);

  await sessionRepository.create({
    companyId: user.company_id,
    userId: user.id,
    refreshTokenHash: hashToken(refreshToken),
    deviceSignature: meta.deviceSignature,
    ipAddress: meta.ipAddress,
    userAgent: meta.userAgent,
    expiresAt: new Date(exp * 1000),
  });

  return refreshToken;
}

async function login(identifier, password, meta = {}) {
  const user = await userRepository.findActiveByIdentifier(identifier);
  if (!user || user.status !== 'active') {
    throw new AppError('AUTH_003');
  }

  const passwordMatches = await bcrypt.compare(password, user.password_hash);
  if (!passwordMatches) {
    throw new AppError('AUTH_003');
  }

  const role = await roleRepository.findById(user.role_id);
  const accessToken = signAccessToken(user, role?.key);
  const refreshToken = await issueSession(user, meta);

  return {
    accessToken,
    refreshToken,
    user: {
      id: user.id,
      fullName: user.full_name,
      email: user.email,
      companyId: user.company_id,
      roleKey: role?.key,
    },
  };
}

async function refresh(refreshToken, meta = {}) {
  let decoded;
  try {
    decoded = jwt.verify(refreshToken, env.auth.refreshSecret);
  } catch (_err) {
    throw new AppError('AUTH_005');
  }

  const existing = await sessionRepository.findActiveByRefreshHash(hashToken(refreshToken));
  if (!existing) {
    throw new AppError('AUTH_005');
  }

  const user = await userRepository.findById(decoded.sub);
  if (!user || user.status !== 'active') {
    throw new AppError('AUTH_005');
  }

  // Rotate: revoke the presented refresh token and issue a new pair.
  await sessionRepository.revokeById(existing.id);

  const role = await roleRepository.findById(user.role_id);
  const accessToken = signAccessToken(user, role?.key);
  const newRefreshToken = await issueSession(user, meta);

  return { accessToken, refreshToken: newRefreshToken };
}

async function logout(refreshToken) {
  await sessionRepository.revokeByRefreshHash(hashToken(refreshToken));
}

module.exports = { login, refresh, logout };
