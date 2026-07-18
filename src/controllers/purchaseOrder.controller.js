const asyncHandler = require('../utils/asyncHandler');
const { sendSuccess } = require('../utils/response');
const poService = require('../services/purchaseOrder.service');

const list = asyncHandler(async (req, res) => {
  const { rows, meta } = await poService.listPurchaseOrders(req.tenant.companyId, req.pagination, { status: req.query.status });
  return sendSuccess(res, { message: 'Purchase orders list.', data: rows, meta });
});

const getOne = asyncHandler(async (req, res) => {
  const po = await poService.getPurchaseOrder(req.tenant.companyId, req.params.id);
  return sendSuccess(res, { message: 'Purchase order detail.', data: po });
});

const create = asyncHandler(async (req, res) => {
  const po = await poService.createPurchaseOrder(req.tenant.companyId, req.body, req.user.id);
  return sendSuccess(res, { message: 'Purchase order created.', data: po, statusCode: 201 });
});

const generateNumber = asyncHandler(async (req, res) => {
  const poNumber = await poService.generatePoNumber();
  return sendSuccess(res, { message: 'PO number generated.', data: { poNumber } });
});

const transitionStatus = asyncHandler(async (req, res) => {
  const po = await poService.transitionPurchaseOrder(req.tenant.companyId, req.params.id, req.body.status, req.user.id);
  return sendSuccess(res, { message: 'Purchase order status updated.', data: po });
});

module.exports = { list, getOne, create, transitionStatus, generateNumber };
