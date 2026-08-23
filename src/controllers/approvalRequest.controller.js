const asyncHandler = require('../utils/asyncHandler');
const { sendSuccess } = require('../utils/response');
const approvalRequestService = require('../services/approvalRequest.service');

const createVendorPaymentRequest = asyncHandler(async (req, res) => {
  const request = await approvalRequestService.createVendorPaymentRequest(req.tenant.companyId, req.body, req.user.id);
  return sendSuccess(res, { message: 'Vendor payment request raised.', data: request, statusCode: 201 });
});

const createCreditLimitOverrideRequest = asyncHandler(async (req, res) => {
  const request = await approvalRequestService.createCreditLimitOverrideRequest(req.tenant.companyId, req.body, req.user.id);
  return sendSuccess(res, { message: 'Credit limit override request raised.', data: request, statusCode: 201 });
});

const list = asyncHandler(async (req, res) => {
  const { rows, meta } = await approvalRequestService.listApprovalRequests(req.tenant.companyId, req.pagination, {
    status: req.query.status,
    requestType: req.query.request_type,
  });
  return sendSuccess(res, { message: 'Approval requests list.', data: rows, meta });
});

const getOne = asyncHandler(async (req, res) => {
  const request = await approvalRequestService.getApprovalRequest(req.tenant.companyId, req.params.id);
  return sendSuccess(res, { message: 'Approval request detail.', data: request });
});

const approve = asyncHandler(async (req, res) => {
  const request = await approvalRequestService.approve(req.tenant.companyId, req.params.id, req.user.id);
  return sendSuccess(res, { message: 'Approval request approved.', data: request });
});

const reject = asyncHandler(async (req, res) => {
  const request = await approvalRequestService.reject(req.tenant.companyId, req.params.id, req.user.id);
  return sendSuccess(res, { message: 'Approval request rejected.', data: request });
});

module.exports = { createVendorPaymentRequest, createCreditLimitOverrideRequest, list, getOne, approve, reject };
