const asyncHandler = require('../utils/asyncHandler');
const { sendSuccess } = require('../utils/response');
const bomService = require('../services/bom.service');

const create = asyncHandler(async (req, res) => {
  const line = await bomService.createBomLine(req.tenant.companyId, req.body, req.user.id);
  return sendSuccess(res, { message: 'BOM line created.', data: line, statusCode: 201 });
});

const list = asyncHandler(async (req, res) => {
  const { rows, meta } = await bomService.listBom(req.tenant.companyId, req.pagination, { productId: req.query.product_id });
  return sendSuccess(res, { message: 'BOM list.', data: rows, meta });
});

const getOne = asyncHandler(async (req, res) => {
  const line = await bomService.getBomLine(req.tenant.companyId, req.params.id);
  return sendSuccess(res, { message: 'BOM line detail.', data: line });
});

const update = asyncHandler(async (req, res) => {
  const line = await bomService.updateBomLine(req.tenant.companyId, req.params.id, req.body, req.user.id);
  return sendSuccess(res, { message: 'BOM line updated.', data: line });
});

const remove = asyncHandler(async (req, res) => {
  await bomService.deleteBomLine(req.tenant.companyId, req.params.id, req.user.id);
  return sendSuccess(res, { message: 'BOM line deleted.' });
});

module.exports = { create, list, getOne, update, remove };
