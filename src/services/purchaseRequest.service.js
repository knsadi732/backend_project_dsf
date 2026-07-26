const AppError = require('../utils/AppError');
const { withTransaction } = require('../config/db');
const { buildPaginationMeta } = require('../utils/pagination');
const { assertTransition } = require('../utils/stateMachine');
const { PURCHASE_REQUEST_STATUS, PURCHASE_REQUEST_STATUS_PIPELINE } = require('../constants/enums');
const purchaseRequestRepository = require('../repositories/purchaseRequest.repository');

async function createPurchaseRequest(
  companyId,
  { branchId, prNumber, warehouseId, departmentId, priority, requiredDate, items, remarks },
  actorId,
) {
  return withTransaction(async (client) => {
    const pr = await purchaseRequestRepository.create(
      client,
      companyId,
      { branchId, warehouseId, departmentId, requestedBy: actorId, prNumber, priority, requiredDate, remarks },
      actorId,
    );
    await purchaseRequestRepository.createItems(client, pr.id, items);
    const createdItems = await purchaseRequestRepository.findItems(pr.id, (text, params) => client.query(text, params));
    return { ...pr, items: createdItems };
  });
}

async function getPurchaseRequest(companyId, id) {
  const pr = await purchaseRequestRepository.findById(companyId, id);
  if (!pr) throw new AppError('PR_002');
  const items = await purchaseRequestRepository.findItems(id);
  return { ...pr, items };
}

async function generatePrNumber() {
  return purchaseRequestRepository.peekPrNumber();
}

async function listPurchaseRequests(companyId, pagination, filters) {
  const { rows, totalRecords } = await purchaseRequestRepository.list(companyId, pagination, filters);
  return { rows, meta: buildPaginationMeta({ page: pagination.page, limit: pagination.limit, totalRecords }) };
}

/**
 * Lifecycle (plan.md Chapter 11.4): Draft -> Submitted -> Pending Approval ->
 * Approved -> Converted to RFQ. Rejected forks off Pending Approval only and
 * is terminal — a rejected request cannot be re-decided (raise a new PR instead).
 */
async function decidePurchaseRequest(companyId, id, nextStatus, actorId) {
  return withTransaction(async (client) => {
    const pr = await purchaseRequestRepository.findByIdForUpdate(client, companyId, id);
    if (!pr) throw new AppError('PR_002');

    if (nextStatus === PURCHASE_REQUEST_STATUS.REJECTED) {
      if (pr.status !== PURCHASE_REQUEST_STATUS.PENDING_APPROVAL) throw new AppError('PR_001');
    } else {
      assertTransition(PURCHASE_REQUEST_STATUS_PIPELINE, pr.status, nextStatus, 'PR_001');
    }

    const updated = await purchaseRequestRepository.updateStatus(client, id, pr.version, nextStatus, actorId);
    if (!updated) throw new AppError('PR_001', [], 'Purchase request was modified concurrently — retry the decision.');
    return updated;
  });
}

module.exports = {
  createPurchaseRequest,
  getPurchaseRequest,
  listPurchaseRequests,
  decidePurchaseRequest,
  generatePrNumber,
};
