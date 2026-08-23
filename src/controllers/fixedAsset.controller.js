const asyncHandler = require('../utils/asyncHandler');
const { sendSuccess } = require('../utils/response');
const fixedAssetService = require('../services/fixedAsset.service');

const registerAsset = asyncHandler(async (req, res) => {
  const result = await fixedAssetService.registerAsset(req.tenant.companyId, req.body, req.user.id);
  return sendSuccess(res, { message: 'Fixed asset registered.', data: result, statusCode: 201 });
});

const listAssets = asyncHandler(async (req, res) => {
  const { rows, meta } = await fixedAssetService.listAssets(req.tenant.companyId, req.pagination, {
    status: req.query.status,
    itemCategoryId: req.query.item_category_id,
  });
  return sendSuccess(res, { message: 'Fixed assets list.', data: rows, meta });
});

const getAsset = asyncHandler(async (req, res) => {
  const asset = await fixedAssetService.getAsset(req.tenant.companyId, req.params.id);
  return sendSuccess(res, { message: 'Fixed asset detail.', data: asset });
});

const reassignAsset = asyncHandler(async (req, res) => {
  const asset = await fixedAssetService.reassignAsset(req.tenant.companyId, req.params.id, req.body, req.user.id);
  return sendSuccess(res, { message: 'Fixed asset reassigned.', data: asset });
});

const recordMaintenance = asyncHandler(async (req, res) => {
  const result = await fixedAssetService.recordMaintenance(
    req.tenant.companyId,
    { ...req.body, assetId: req.params.id },
    req.user.id,
  );
  return sendSuccess(res, { message: 'Maintenance recorded.', data: result, statusCode: 201 });
});

const listMaintenanceLogs = asyncHandler(async (req, res) => {
  const { rows, meta } = await fixedAssetService.listMaintenanceLogs(req.tenant.companyId, req.pagination, {
    assetId: req.query.asset_id,
  });
  return sendSuccess(res, { message: 'Maintenance logs list.', data: rows, meta });
});

const disposeAsset = asyncHandler(async (req, res) => {
  const asset = await fixedAssetService.disposeAsset(req.tenant.companyId, req.params.id, req.body, req.user.id);
  return sendSuccess(res, { message: 'Fixed asset disposed.', data: asset });
});

module.exports = {
  registerAsset,
  listAssets,
  getAsset,
  reassignAsset,
  recordMaintenance,
  listMaintenanceLogs,
  disposeAsset,
};
