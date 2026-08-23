const asyncHandler = require('../utils/asyncHandler');
const { sendSuccess } = require('../utils/response');
const mirService = require('../services/materialIssueRequest.service');

const list = asyncHandler(async (req, res) => {
  const { rows, meta } = await mirService.listMaterialIssueRequests(req.tenant.companyId, req.pagination, { status: req.query.status });
  return sendSuccess(res, { message: 'Material issue requests list.', data: rows, meta });
});

const getOne = asyncHandler(async (req, res) => {
  const mir = await mirService.getMaterialIssueRequest(req.tenant.companyId, req.params.id);
  return sendSuccess(res, { message: 'Material issue request detail.', data: mir });
});

const approve = asyncHandler(async (req, res) => {
  const mir = await mirService.approve(req.tenant.companyId, req.params.id, req.user.id);
  return sendSuccess(res, { message: 'Material issue request approved.', data: mir });
});

const reject = asyncHandler(async (req, res) => {
  const mir = await mirService.reject(req.tenant.companyId, req.params.id, req.user.id);
  return sendSuccess(res, { message: 'Material issue request rejected.', data: mir });
});

const issue = asyncHandler(async (req, res) => {
  const mir = await mirService.issue(req.tenant.companyId, req.params.id, req.user.id, req.body.items);
  return sendSuccess(res, { message: 'Material issue request updated.', data: mir });
});

module.exports = { list, getOne, approve, reject, issue };
