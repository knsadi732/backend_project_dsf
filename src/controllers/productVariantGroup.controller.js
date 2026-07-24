const asyncHandler = require('../utils/asyncHandler');
const { sendSuccess } = require('../utils/response');
const groupService = require('../services/productVariantGroup.service');

const list = asyncHandler(async (req, res) => {
  const { rows, meta } = await groupService.listGroups(req.tenant.companyId, req.pagination, { productId: req.query.product_id });
  return sendSuccess(res, { message: 'Variant groups list.', data: rows, meta });
});

const getOne = asyncHandler(async (req, res) => {
  const group = await groupService.getGroup(req.tenant.companyId, req.params.id);
  return sendSuccess(res, { message: 'Variant group detail.', data: group });
});

const create = asyncHandler(async (req, res) => {
  const group = await groupService.createGroup(req.tenant.companyId, req.body, req.user.id);
  return sendSuccess(res, { message: 'Variant group created.', data: group, statusCode: 201 });
});

const update = asyncHandler(async (req, res) => {
  const group = await groupService.updateGroup(req.tenant.companyId, req.params.id, req.body, req.user.id);
  return sendSuccess(res, { message: 'Variant group updated.', data: group });
});

const remove = asyncHandler(async (req, res) => {
  await groupService.deleteGroup(req.tenant.companyId, req.params.id, req.user.id);
  return sendSuccess(res, { message: 'Variant group deleted.' });
});

module.exports = { list, getOne, create, update, remove };
