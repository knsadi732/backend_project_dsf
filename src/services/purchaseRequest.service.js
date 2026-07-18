const AppError = require('../utils/AppError');
const { withTransaction } = require('../config/db');
const { buildPaginationMeta } = require('../utils/pagination');
const { PURCHASE_REQUEST_STATUS } = require('../constants/enums');
const purchaseRequestRepository = require('../repositories/purchaseRequest.repository');

async function createPurchaseRequest(companyId, { branchId, prNumber, warehouseId, departmentId, items, remarks }, actorId) {
  return withTransaction(async (client) => {
    const pr = await purchaseRequestRepository.create(
      client,
      companyId,
      { branchId, warehouseId, departmentId, requestedBy: actorId, prNumber, remarks },
      actorId,
    );
    await purchaseRequestRepository.createItems(client, pr.id, items);
    return pr;
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
 * Approval Workflow: Pending forks to Approved or Rejected; both are terminal
 * — a decided request cannot be re-decided (raise a new PR instead).
 */
async function decidePurchaseRequest(companyId, id, nextStatus, actorId) {
  return withTransaction(async (client) => {
    const pr = await purchaseRequestRepository.findByIdForUpdate(client, companyId, id);
    if (!pr) throw new AppError('PR_002');
    if (pr.status !== PURCHASE_REQUEST_STATUS.PENDING) throw new AppError('PR_001');

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
