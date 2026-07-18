const asyncHandler = require('../utils/asyncHandler');
const { sendSuccess } = require('../utils/response');
const departmentService = require('../services/department.service');

const listDepartments = asyncHandler(async (req, res) => {
  const { rows, meta } = await departmentService.listDepartments(req.tenant.companyId, req.pagination);
  return sendSuccess(res, { message: 'Departments list.', data: rows, meta });
});

const getDepartment = asyncHandler(async (req, res) => {
  const department = await departmentService.getDepartment(req.tenant.companyId, req.params.id);
  return sendSuccess(res, { message: 'Department detail.', data: department });
});

const createDepartment = asyncHandler(async (req, res) => {
  const department = await departmentService.createDepartment(req.tenant.companyId, req.body, req.user.id);
  return sendSuccess(res, { message: 'Department created.', data: department, statusCode: 201 });
});

const updateDepartment = asyncHandler(async (req, res) => {
  const department = await departmentService.updateDepartment(req.tenant.companyId, req.params.id, req.body, req.user.id);
  return sendSuccess(res, { message: 'Department updated.', data: department });
});

const deleteDepartment = asyncHandler(async (req, res) => {
  await departmentService.deleteDepartment(req.tenant.companyId, req.params.id, req.user.id);
  return sendSuccess(res, { message: 'Department deleted.' });
});

module.exports = { listDepartments, getDepartment, createDepartment, updateDepartment, deleteDepartment };
