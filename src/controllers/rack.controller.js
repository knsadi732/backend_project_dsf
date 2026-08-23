const asyncHandler = require('../utils/asyncHandler');
const { sendSuccess } = require('../utils/response');
const service = require('../services/rack.service');

const list = asyncHandler(async (req, res) => {
  const { rows, meta } = await service.listRacks(req.tenant.companyId, req.pagination, { zoneId: req.query.zone_id });
  return sendSuccess(res, { message: 'Racks list.', data: rows, meta });
});

const getOne = asyncHandler(async (req, res) => {
  const rack = await service.getRack(req.tenant.companyId, req.params.id);
  return sendSuccess(res, { message: 'Rack detail.', data: rack });
});

const create = asyncHandler(async (req, res) => {
  const rack = await service.createRack(req.tenant.companyId, req.body, req.user.id);
  return sendSuccess(res, { message: 'Rack created.', data: rack, statusCode: 201 });
});

const update = asyncHandler(async (req, res) => {
  const rack = await service.updateRack(req.tenant.companyId, req.params.id, req.body, req.user.id);
  return sendSuccess(res, { message: 'Rack updated.', data: rack });
});

const remove = asyncHandler(async (req, res) => {
  await service.deleteRack(req.tenant.companyId, req.params.id, req.user.id);
  return sendSuccess(res, { message: 'Rack deleted.' });
});

module.exports = { list, getOne, create, update, remove };
