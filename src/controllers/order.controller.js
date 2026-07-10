const asyncHandler = require('../utils/asyncHandler');
const { sendSuccess } = require('../utils/response');
const orderService = require('../services/order.service');

const list = asyncHandler(async (req, res) => {
  const { rows, meta } = await orderService.listOrders(req.tenant.companyId, req.pagination, { status: req.query.status });
  return sendSuccess(res, { message: 'Orders list.', data: rows, meta });
});

const getOne = asyncHandler(async (req, res) => {
  const order = await orderService.getOrder(req.tenant.companyId, req.params.id);
  return sendSuccess(res, { message: 'Order detail.', data: order });
});

const create = asyncHandler(async (req, res) => {
  const order = await orderService.createOrder(req.tenant.companyId, req.body, req.user.id);
  return sendSuccess(res, { message: 'Order created.', data: order, statusCode: 201 });
});

const transitionStatus = asyncHandler(async (req, res) => {
  const order = await orderService.transitionOrder(req.tenant.companyId, req.params.id, req.body.status, req.user.id);
  return sendSuccess(res, { message: 'Order status updated.', data: order });
});

const transitionPayment = asyncHandler(async (req, res) => {
  const order = await orderService.updatePaymentStatus(
    req.tenant.companyId,
    req.params.id,
    req.body.paymentStatus,
    req.user.id,
  );
  return sendSuccess(res, { message: 'Order payment status updated.', data: order });
});

module.exports = { list, getOne, create, transitionStatus, transitionPayment };
