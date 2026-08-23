const AppError = require('../utils/AppError');
const { withTransaction } = require('../config/db');
const { buildPaginationMeta } = require('../utils/pagination');
const approvalRequestRepository = require('../repositories/approvalRequest.repository');
const customerRepository = require('../repositories/customer.repository');
const vendorBillService = require('./vendorBill.service');

async function createVendorPaymentRequest(companyId, { vendorBillId, amount, utrNumber, remarks }, actorId) {
  return approvalRequestRepository.create(
    companyId,
    {
      requestType: 'vendor_payment',
      referenceType: 'vendor_bill',
      referenceId: vendorBillId,
      payload: { amount, utrNumber },
      remarks,
    },
    actorId,
  );
}

async function createCreditLimitOverrideRequest(companyId, { customerId, requestedLimit, remarks }, actorId) {
  return approvalRequestRepository.create(
    companyId,
    {
      requestType: 'credit_limit_override',
      referenceType: 'customer',
      referenceId: customerId,
      payload: { requestedLimit },
      remarks,
    },
    actorId,
  );
}

async function getApprovalRequest(companyId, id) {
  const request = await approvalRequestRepository.findById(companyId, id);
  if (!request) throw new AppError('APR_001');
  return request;
}

async function listApprovalRequests(companyId, pagination, filters) {
  const { rows, totalRecords } = await approvalRequestRepository.list(companyId, pagination, filters);
  return { rows, meta: buildPaginationMeta({ page: pagination.page, limit: pagination.limit, totalRecords }) };
}

/**
 * One-click approval — executes the real underlying action (the vendor
 * payment actually posts, or the customer's credit_limit actually changes)
 * atomically with the status flip to "approved". Same "request now, act on
 * approve" pattern as Material Issue Requests.
 */
async function approve(companyId, id, actorId) {
  return withTransaction(async (client) => {
    const request = await approvalRequestRepository.findByIdForUpdate(client, companyId, id);
    if (!request) throw new AppError('APR_001');
    if (request.status !== 'pending_approval') throw new AppError('APR_002');

    if (request.request_type === 'vendor_payment') {
      await vendorBillService.recordPaymentWithClient(client, companyId, request.reference_id, request.payload, actorId);
    } else if (request.request_type === 'credit_limit_override') {
      const updated = await customerRepository.setCreditLimit(client, companyId, request.reference_id, request.payload.requestedLimit, actorId);
      if (!updated) throw new AppError('APR_001', [], 'Referenced customer no longer exists.');
    }

    const updated = await approvalRequestRepository.updateStatus(client, id, request.version, { status: 'approved', approvedBy: actorId }, actorId);
    if (!updated) throw new AppError('APR_002', [], 'Approval request was modified concurrently — retry.');
    return updated;
  });
}

async function reject(companyId, id, actorId) {
  return withTransaction(async (client) => {
    const request = await approvalRequestRepository.findByIdForUpdate(client, companyId, id);
    if (!request) throw new AppError('APR_001');
    if (request.status !== 'pending_approval') throw new AppError('APR_002');

    const updated = await approvalRequestRepository.updateStatus(client, id, request.version, { status: 'rejected' }, actorId);
    if (!updated) throw new AppError('APR_002', [], 'Approval request was modified concurrently — retry.');
    return updated;
  });
}

module.exports = {
  createVendorPaymentRequest,
  createCreditLimitOverrideRequest,
  getApprovalRequest,
  listApprovalRequests,
  approve,
  reject,
};
