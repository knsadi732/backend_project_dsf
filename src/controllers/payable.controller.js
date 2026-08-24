const asyncHandler = require('../utils/asyncHandler');
const { sendSuccess } = require('../utils/response');
const payableService = require('../services/payable.service');

const list = asyncHandler(async (req, res) => {
  const { rows, meta } = await payableService.listPayables(req.tenant.companyId, req.pagination, { status: req.query.status });
  return sendSuccess(res, { message: 'Payables list.', data: rows, meta });
});

const getOne = asyncHandler(async (req, res) => {
  const payable = await payableService.getPayable(req.tenant.companyId, req.params.id);
  return sendSuccess(res, { message: 'Payable detail.', data: payable });
});

const create = asyncHandler(async (req, res) => {
  const payable = await payableService.createPayable(req.tenant.companyId, req.body, req.user.id);
  return sendSuccess(res, { message: 'Payable recorded.', data: payable, statusCode: 201 });
});

const generateNumber = asyncHandler(async (req, res) => {
  const payableNumber = await payableService.generatePayableNumber();
  return sendSuccess(res, { message: 'Payable number generated.', data: { payableNumber } });
});

const recordPayment = asyncHandler(async (req, res) => {
  const payment = await payableService.recordPayment(req.tenant.companyId, req.params.id, req.body, req.user.id);
  return sendSuccess(res, { message: 'Payment recorded.', data: payment, statusCode: 201 });
});

const listPayments = asyncHandler(async (req, res) => {
  const { rows, meta } = await payableService.listPayments(req.tenant.companyId, req.params.id, req.pagination);
  return sendSuccess(res, { message: 'Payments list.', data: rows, meta });
});

const writeOff = asyncHandler(async (req, res) => {
  const payable = await payableService.writeOffPayable(req.tenant.companyId, req.params.id, req.user.id);
  return sendSuccess(res, { message: 'Payable written off.', data: payable });
});

module.exports = { list, getOne, create, generateNumber, recordPayment, listPayments, writeOff };
