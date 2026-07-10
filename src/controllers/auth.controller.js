const asyncHandler = require('../utils/asyncHandler');
const { sendSuccess } = require('../utils/response');
const authService = require('../services/auth.service');
const userRepository = require('../repositories/user.repository');
const roleRepository = require('../repositories/role.repository');

function requestMeta(req) {
  return {
    ipAddress: req.ip,
    userAgent: req.headers['user-agent'],
    deviceSignature: req.headers['x-device-signature'],
  };
}

const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  const result = await authService.login(email, password, requestMeta(req));
  return sendSuccess(res, { message: 'Login successful.', data: result });
});

const refresh = asyncHandler(async (req, res) => {
  const { refreshToken } = req.body;
  const result = await authService.refresh(refreshToken, requestMeta(req));
  return sendSuccess(res, { message: 'Token refreshed.', data: result });
});

const logout = asyncHandler(async (req, res) => {
  const { refreshToken } = req.body;
  await authService.logout(refreshToken);
  return sendSuccess(res, { message: 'Logged out.' });
});

const me = asyncHandler(async (req, res) => {
  const user = await userRepository.findById(req.user.id);
  const role = await roleRepository.findById(req.user.roleId);
  return sendSuccess(res, {
    message: 'Current user profile.',
    data: { ...user, role: role ? { id: role.id, key: role.key, name: role.name } : null },
  });
});

module.exports = { login, refresh, logout, me };
