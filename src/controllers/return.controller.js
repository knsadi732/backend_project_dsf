const asyncHandler = require('../utils/asyncHandler');
const { sendSuccess } = require('../utils/response');
const returnService = require('../services/return.service');

const list = asyncHandler(async (req, res) => {
  const { rows, meta } = await returnService.listReturns(req.tenant.companyId, req.pagination, {
    status: req.query.status,
    type: req.query.type,
  });
  return sendSuccess(res, { message: 'Returns list.', data: rows, meta });
});

const summary = asyncHandler(async (req, res) => {
  const data = await returnService.getReturnsSummary(req.tenant.companyId, { from: req.query.from, to: req.query.to });
  return sendSuccess(res, { message: 'Returns summary.', data });
});

const summaryByProduct = asyncHandler(async (req, res) => {
  const data = await returnService.getReturnsSummaryByProduct(req.tenant.companyId, { from: req.query.from, to: req.query.to });
  return sendSuccess(res, { message: 'Returns summary by product.', data });
});

const getOne = asyncHandler(async (req, res) => {
  const returnRecord = await returnService.getReturn(req.tenant.companyId, req.params.id);
  return sendSuccess(res, { message: 'Return detail.', data: returnRecord });
});

const generateNumber = asyncHandler(async (req, res) => {
  const returnNumber = await returnService.generateReturnNumber();
  return sendSuccess(res, { message: 'Return number generated.', data: { returnNumber } });
});

const create = asyncHandler(async (req, res) => {
  const returnRecord = await returnService.createReturn(req.tenant.companyId, req.body, req.user.id);
  return sendSuccess(res, { message: 'Return recorded.', data: returnRecord, statusCode: 201 });
});

const update = asyncHandler(async (req, res) => {
  const returnRecord = await returnService.updateReturn(req.tenant.companyId, req.params.id, req.body, req.user.id);
  return sendSuccess(res, { message: 'Return updated.', data: returnRecord });
});

const remove = asyncHandler(async (req, res) => {
  await returnService.deleteReturn(req.tenant.companyId, req.params.id, req.user.id);
  return sendSuccess(res, { message: 'Return deleted.' });
});

module.exports = { list, summary, summaryByProduct, getOne, generateNumber, create, update, remove };
