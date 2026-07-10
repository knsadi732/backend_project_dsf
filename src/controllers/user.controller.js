const asyncHandler = require('../utils/asyncHandler');
const { sendSuccess } = require('../utils/response');
const userService = require('../services/user.service');
const auditService = require('../services/audit.service');

const listUsers = asyncHandler(async (req, res) => {
  const { rows, meta } = await userService.listUsers(req.tenant.companyId, req.pagination);
  return sendSuccess(res, { message: 'Users list.', data: rows, meta });
});

const getUser = asyncHandler(async (req, res) => {
  const user = await userService.getUser(req.tenant.companyId, req.params.id);
  return sendSuccess(res, { message: 'User detail.', data: user });
});

const createUser = asyncHandler(async (req, res) => {
  const user = await userService.createUser(req.tenant.companyId, req.body, req.user.id);
  return sendSuccess(res, { message: 'User created.', data: user, statusCode: 201 });
});

const updateUser = asyncHandler(async (req, res) => {
  const user = await userService.updateUser(req.tenant.companyId, req.params.id, req.body, req.user.id);
  return sendSuccess(res, { message: 'User updated.', data: user });
});

const deleteUser = asyncHandler(async (req, res) => {
  await userService.deleteUser(req.tenant.companyId, req.params.id, req.user.id);
  return sendSuccess(res, { message: 'User deleted.' });
});

const listAuditLogs = asyncHandler(async (req, res) => {
  const { rows, meta } = await auditService.listAuditLogs(req.tenant.companyId, req.pagination);
  return sendSuccess(res, { message: 'Audit logs.', data: rows, meta });
});

module.exports = { listUsers, getUser, createUser, updateUser, deleteUser, listAuditLogs };
