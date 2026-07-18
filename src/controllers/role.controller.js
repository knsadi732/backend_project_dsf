const asyncHandler = require('../utils/asyncHandler');
const { sendSuccess } = require('../utils/response');
const roleService = require('../services/role.service');

const listRoles = asyncHandler(async (req, res) => {
  const roles = await roleService.listRoles(req.tenant.companyId);
  return sendSuccess(res, { message: 'Roles list.', data: roles });
});

module.exports = { listRoles };
