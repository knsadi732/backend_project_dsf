const asyncHandler = require('../utils/asyncHandler');
const { sendSuccess } = require('../utils/response');
const service = require('../services/bin.service');

const list = asyncHandler(async (req, res) => {
  const { rows, meta } = await service.listBins(req.tenant.companyId, req.pagination, { shelfId: req.query.shelf_id });
  return sendSuccess(res, { message: 'Bins list.', data: rows, meta });
});

const getOne = asyncHandler(async (req, res) => {
  const bin = await service.getBin(req.tenant.companyId, req.params.id);
  return sendSuccess(res, { message: 'Bin detail.', data: bin });
});

const create = asyncHandler(async (req, res) => {
  const bin = await service.createBin(req.tenant.companyId, req.body, req.user.id);
  return sendSuccess(res, { message: 'Bin created.', data: bin, statusCode: 201 });
});

const update = asyncHandler(async (req, res) => {
  const bin = await service.updateBin(req.tenant.companyId, req.params.id, req.body, req.user.id);
  return sendSuccess(res, { message: 'Bin updated.', data: bin });
});

const remove = asyncHandler(async (req, res) => {
  await service.deleteBin(req.tenant.companyId, req.params.id, req.user.id);
  return sendSuccess(res, { message: 'Bin deleted.' });
});

module.exports = { list, getOne, create, update, remove };
