const asyncHandler = require('../utils/asyncHandler');
const { sendSuccess } = require('../utils/response');
const service = require('../services/shelf.service');

const list = asyncHandler(async (req, res) => {
  const { rows, meta } = await service.listShelves(req.tenant.companyId, req.pagination, { rackId: req.query.rack_id });
  return sendSuccess(res, { message: 'Shelves list.', data: rows, meta });
});

const getOne = asyncHandler(async (req, res) => {
  const shelf = await service.getShelf(req.tenant.companyId, req.params.id);
  return sendSuccess(res, { message: 'Shelf detail.', data: shelf });
});

const create = asyncHandler(async (req, res) => {
  const shelf = await service.createShelf(req.tenant.companyId, req.body, req.user.id);
  return sendSuccess(res, { message: 'Shelf created.', data: shelf, statusCode: 201 });
});

const update = asyncHandler(async (req, res) => {
  const shelf = await service.updateShelf(req.tenant.companyId, req.params.id, req.body, req.user.id);
  return sendSuccess(res, { message: 'Shelf updated.', data: shelf });
});

const remove = asyncHandler(async (req, res) => {
  await service.deleteShelf(req.tenant.companyId, req.params.id, req.user.id);
  return sendSuccess(res, { message: 'Shelf deleted.' });
});

module.exports = { list, getOne, create, update, remove };
