const asyncHandler = require('../utils/asyncHandler');
const { sendSuccess } = require('../utils/response');
const service = require('../services/warehouseZone.service');

const list = asyncHandler(async (req, res) => {
  const { rows, meta } = await service.listZones(req.tenant.companyId, req.pagination);
  return sendSuccess(res, { message: 'Warehouse zones list.', data: rows, meta });
});

const getOne = asyncHandler(async (req, res) => {
  const zone = await service.getZone(req.tenant.companyId, req.params.id);
  return sendSuccess(res, { message: 'Warehouse zone detail.', data: zone });
});

const create = asyncHandler(async (req, res) => {
  const zone = await service.createZone(req.tenant.companyId, req.body, req.user.id);
  return sendSuccess(res, { message: 'Warehouse zone created.', data: zone, statusCode: 201 });
});

const update = asyncHandler(async (req, res) => {
  const zone = await service.updateZone(req.tenant.companyId, req.params.id, req.body, req.user.id);
  return sendSuccess(res, { message: 'Warehouse zone updated.', data: zone });
});

const remove = asyncHandler(async (req, res) => {
  await service.deleteZone(req.tenant.companyId, req.params.id, req.user.id);
  return sendSuccess(res, { message: 'Warehouse zone deleted.' });
});

module.exports = { list, getOne, create, update, remove };
