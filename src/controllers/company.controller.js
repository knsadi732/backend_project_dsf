const asyncHandler = require('../utils/asyncHandler');
const { sendSuccess } = require('../utils/response');
const companyService = require('../services/company.service');
const branchService = require('../services/branch.service');
const warehouseService = require('../services/warehouse.service');
const settingsService = require('../services/settings.service');

const getCompany = asyncHandler(async (req, res) => {
  const company = await companyService.getCompany(req.tenant.companyId);
  return sendSuccess(res, { message: 'Company profile.', data: company });
});

const updateCompany = asyncHandler(async (req, res) => {
  const company = await companyService.updateCompany(req.tenant.companyId, req.body, req.user.id);
  return sendSuccess(res, { message: 'Company updated.', data: company });
});

const listBranches = asyncHandler(async (req, res) => {
  const { rows, meta } = await branchService.listBranches(req.tenant.companyId, req.pagination);
  return sendSuccess(res, { message: 'Branches list.', data: rows, meta });
});

const getBranch = asyncHandler(async (req, res) => {
  const branch = await branchService.getBranch(req.tenant.companyId, req.params.id);
  return sendSuccess(res, { message: 'Branch detail.', data: branch });
});

const createBranch = asyncHandler(async (req, res) => {
  const branch = await branchService.createBranch(req.tenant.companyId, req.body, req.user.id);
  return sendSuccess(res, { message: 'Branch created.', data: branch, statusCode: 201 });
});

const updateBranch = asyncHandler(async (req, res) => {
  const branch = await branchService.updateBranch(req.tenant.companyId, req.params.id, req.body, req.user.id);
  return sendSuccess(res, { message: 'Branch updated.', data: branch });
});

const deleteBranch = asyncHandler(async (req, res) => {
  await branchService.deleteBranch(req.tenant.companyId, req.params.id, req.user.id);
  return sendSuccess(res, { message: 'Branch deleted.' });
});

const listWarehouses = asyncHandler(async (req, res) => {
  const { rows, meta } = await warehouseService.listWarehouses(req.tenant.companyId, req.pagination, {
    branchId: req.query.branch_id,
  });
  return sendSuccess(res, { message: 'Warehouses list.', data: rows, meta });
});

const getWarehouse = asyncHandler(async (req, res) => {
  const warehouse = await warehouseService.getWarehouse(req.tenant.companyId, req.params.id);
  return sendSuccess(res, { message: 'Warehouse detail.', data: warehouse });
});

const createWarehouse = asyncHandler(async (req, res) => {
  const warehouse = await warehouseService.createWarehouse(req.tenant.companyId, req.body, req.user.id);
  return sendSuccess(res, { message: 'Warehouse created.', data: warehouse, statusCode: 201 });
});

const updateWarehouse = asyncHandler(async (req, res) => {
  const warehouse = await warehouseService.updateWarehouse(req.tenant.companyId, req.params.id, req.body, req.user.id);
  return sendSuccess(res, { message: 'Warehouse updated.', data: warehouse });
});

const deleteWarehouse = asyncHandler(async (req, res) => {
  await warehouseService.deleteWarehouse(req.tenant.companyId, req.params.id, req.user.id);
  return sendSuccess(res, { message: 'Warehouse deleted.' });
});

const getSettings = asyncHandler(async (req, res) => {
  const settings = await settingsService.getSettings(req.tenant.companyId);
  return sendSuccess(res, { message: 'Company settings.', data: settings });
});

const updateSettings = asyncHandler(async (req, res) => {
  const settings = await settingsService.updateSettings(req.tenant.companyId, req.body, req.user.id);
  return sendSuccess(res, { message: 'Settings updated.', data: settings });
});

module.exports = {
  getCompany,
  updateCompany,
  listBranches,
  getBranch,
  createBranch,
  updateBranch,
  deleteBranch,
  listWarehouses,
  getWarehouse,
  createWarehouse,
  updateWarehouse,
  deleteWarehouse,
  getSettings,
  updateSettings,
};
