const asyncHandler = require('../utils/asyncHandler');
const { sendSuccess } = require('../utils/response');
const prService = require('../services/purchaseRequest.service');

const list = asyncHandler(async (req, res) => {
  const { rows, meta } = await prService.listPurchaseRequests(req.tenant.companyId, req.pagination, { status: req.query.status });
  return sendSuccess(res, { message: 'Purchase requests list.', data: rows, meta });
});

const getOne = asyncHandler(async (req, res) => {
  const pr = await prService.getPurchaseRequest(req.tenant.companyId, req.params.id);
  return sendSuccess(res, { message: 'Purchase request detail.', data: pr });
});

const create = asyncHandler(async (req, res) => {
  const pr = await prService.createPurchaseRequest(req.tenant.companyId, req.body, req.user.id);
  return sendSuccess(res, { message: 'Purchase request created.', data: pr, statusCode: 201 });
});

const generateNumber = asyncHandler(async (req, res) => {
  const prNumber = await prService.generatePrNumber();
  return sendSuccess(res, { message: 'PR number generated.', data: { prNumber } });
});

const decideStatus = asyncHandler(async (req, res) => {
  const pr = await prService.decidePurchaseRequest(req.tenant.companyId, req.params.id, req.body.status, req.user.id);
  return sendSuccess(res, { message: 'Purchase request decision recorded.', data: pr });
});

module.exports = { list, getOne, create, generateNumber, decideStatus };
