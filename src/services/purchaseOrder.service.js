const AppError = require('../utils/AppError');
const { withTransaction } = require('../config/db');
const { buildPaginationMeta } = require('../utils/pagination');
const { assertTransition } = require('../utils/stateMachine');
const { PURCHASE_ORDER_STATUS, PURCHASE_ORDER_STATUS_PIPELINE } = require('../constants/enums');
const purchaseOrderRepository = require('../repositories/purchaseOrder.repository');
const stockService = require('./stock.service');

async function createPurchaseOrder(companyId, { branchId, warehouseId, vendorId, items }, actorId) {
  return withTransaction(async (client) => {
    const priced = items.map((item) => ({
      productId: item.productId,
      quantity: item.quantity,
      unitCost: item.unitCost,
      lineTotal: Number(item.quantity) * Number(item.unitCost),
    }));
    const totalAmount = priced.reduce((sum, item) => sum + item.lineTotal, 0);

    const po = await purchaseOrderRepository.create(client, companyId, { branchId, warehouseId, vendorId, totalAmount }, actorId);
    await purchaseOrderRepository.createItems(client, po.id, priced);
    return po;
  });
}

async function getPurchaseOrder(companyId, id) {
  const po = await purchaseOrderRepository.findById(companyId, id);
  if (!po) throw new AppError('PO_002');
  const items = await purchaseOrderRepository.findItems(id);
  return { ...po, items };
}

async function listPurchaseOrders(companyId, pagination, filters) {
  const { rows, totalRecords } = await purchaseOrderRepository.list(companyId, pagination, filters);
  return { rows, meta: buildPaginationMeta({ page: pagination.page, limit: pagination.limit, totalRecords }) };
}

/**
 * Purchase Order Progression (plan.md Chapter 4): Draft -> Approved ->
 * Ordered -> Received (stock added to on-hand) -> Completed.
 */
async function transitionPurchaseOrder(companyId, id, nextStatus, actorId) {
  return withTransaction(
    async (client) => {
      const po = await purchaseOrderRepository.findByIdForUpdate(client, companyId, id);
      if (!po) throw new AppError('PO_002');
      assertTransition(PURCHASE_ORDER_STATUS_PIPELINE, po.status, nextStatus, 'PO_001');

      if (nextStatus === PURCHASE_ORDER_STATUS.RECEIVED) {
        const items = await purchaseOrderRepository.findItems(id);
        for (const item of items) {
          await stockService.receiveStock(client, companyId, po.warehouse_id, item.product_id, item.quantity);
        }
      }

      const updated = await purchaseOrderRepository.updateStatus(client, id, po.version, nextStatus, actorId);
      if (!updated) throw new AppError('PO_001', [], 'Purchase order was modified concurrently — retry the transition.');
      return updated;
    },
    { isolationLevel: 'REPEATABLE READ' },
  );
}

module.exports = { createPurchaseOrder, getPurchaseOrder, listPurchaseOrders, transitionPurchaseOrder };
