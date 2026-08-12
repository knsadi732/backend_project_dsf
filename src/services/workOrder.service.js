const AppError = require('../utils/AppError');
const { withTransaction } = require('../config/db');
const { buildPaginationMeta } = require('../utils/pagination');
const workOrderRepository = require('../repositories/workOrder.repository');

async function createWorkOrder(companyId, payload, actorId) {
  return withTransaction((client) => workOrderRepository.create(client, companyId, payload, actorId));
}

async function getWorkOrder(companyId, id) {
  const workOrder = await workOrderRepository.findById(companyId, id);
  if (!workOrder) throw new AppError('COMMON_001');
  return workOrder;
}

async function listWorkOrders(companyId, pagination, filters) {
  const { rows, totalRecords } = await workOrderRepository.list(companyId, pagination, filters);
  return { rows, meta: buildPaginationMeta({ page: pagination.page, limit: pagination.limit, totalRecords }) };
}

async function updateWorkOrder(companyId, id, payload, actorId) {
  const workOrder = await workOrderRepository.update(companyId, id, payload, actorId);
  if (!workOrder) throw new AppError('COMMON_001');
  return workOrder;
}

async function deleteWorkOrder(companyId, id, actorId) {
  const deleted = await workOrderRepository.softDelete(companyId, id, actorId);
  if (!deleted) throw new AppError('COMMON_001');
}

/**
 * Auto-raises a work order for whatever quantity of `productVariantId`
 * couldn't be covered by on-hand stock — called from order.service.js both
 * at order creation (a genuinely new shortfall) and at CONFIRM
 * (stockService.reserveAvailable reports a shortfall instead of blocking,
 * so the order still confirms with the gap flagged for production). Always
 * takes the caller's transaction `client` so the WO commits atomically with
 * the order write it's tied to. Carries `productVariantId` (not just
 * `productId`) so production knows the exact size/color/SKU to make, not
 * just the generic product. Dedupes against an existing WO for the same
 * order+variant — confirm can only be attempted once per order (it
 * succeeds), but this keeps a retried call safe regardless. production qty
 * = required - available (never negative — callers only invoke this once
 * they've confirmed a shortfall).
 */
async function createShortfallWorkOrder(client, companyId, { productId, productVariantId, salesOrderId, quantity }, actorId) {
  const existing = await workOrderRepository.findBySalesOrderAndVariant(client, companyId, salesOrderId, productVariantId);
  if (existing) return existing;

  return workOrderRepository.create(client, companyId, { productId, productVariantId, salesOrderId, quantity, stage: 'pending' }, actorId);
}

const LOW_STOCK_THRESHOLD = 10;

/**
 * Low-stock replenishment trigger — called after anything that reduces a
 * variant's on-hand quantity (currently only stock.service.js's
 * fulfillReservation, i.e. dispatch). Raises a WO the moment on-hand drops
 * below LOW_STOCK_THRESHOLD, sized to bring stock back up to that
 * threshold, unless one's already open for this exact variant (skip to
 * avoid spamming a fresh WO on every subsequent dispatch while stock stays
 * low — deduped per variant, not per product, since different sizes of the
 * same product can each independently run low).
 */
async function checkLowStockAndReplenish(client, companyId, productId, productVariantId, quantityOnHand, actorId) {
  if (Number(quantityOnHand) >= LOW_STOCK_THRESHOLD) return null;

  const existing = await workOrderRepository.findOpenReplenishmentByVariant(client, companyId, productVariantId);
  if (existing) return existing;

  const quantity = LOW_STOCK_THRESHOLD - Number(quantityOnHand);
  return workOrderRepository.create(
    client,
    companyId,
    { productId, productVariantId, salesOrderId: null, quantity, stage: 'pending' },
    actorId,
  );
}

module.exports = {
  createWorkOrder,
  getWorkOrder,
  listWorkOrders,
  updateWorkOrder,
  deleteWorkOrder,
  createShortfallWorkOrder,
  checkLowStockAndReplenish,
};
