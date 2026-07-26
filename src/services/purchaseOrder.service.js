const AppError = require('../utils/AppError');
const { withTransaction } = require('../config/db');
const { buildPaginationMeta } = require('../utils/pagination');
const { assertTransition } = require('../utils/stateMachine');
const { PURCHASE_ORDER_STATUS, PURCHASE_ORDER_STATUS_PIPELINE, PURCHASE_REQUEST_STATUS } = require('../constants/enums');
const purchaseOrderRepository = require('../repositories/purchaseOrder.repository');
const purchaseRequestRepository = require('../repositories/purchaseRequest.repository');
const stockService = require('./stock.service');
const grnService = require('./grn.service');

/**
 * Business rule (plan.md Chapter 11.20): a Purchase Order can only be created
 * against an approved Purchase Request.
 */
async function createPurchaseOrder(
  companyId,
  { branchId, poNumber, purchaseRequestId, warehouseId, vendorId, deliveryAddress, taxAmount, paymentTerms, expectedDeliveryDate, items },
  actorId,
) {
  return withTransaction(async (client) => {
    const pr = await purchaseRequestRepository.findById(companyId, purchaseRequestId);
    if (!pr) throw new AppError('PR_002');
    if (pr.status !== PURCHASE_REQUEST_STATUS.APPROVED && pr.status !== PURCHASE_REQUEST_STATUS.CONVERTED_TO_RFQ) {
      throw new AppError('PR_003');
    }

    const priced = items.map((item) => ({
      productVariantId: item.productVariantId,
      quantity: item.quantity,
      unitCost: item.unitCost,
      lineTotal: Number(item.quantity) * Number(item.unitCost),
    }));
    const subtotal = priced.reduce((sum, item) => sum + item.lineTotal, 0);
    const totalAmount = subtotal + Number(taxAmount || 0);

    const po = await purchaseOrderRepository.create(
      client,
      companyId,
      { branchId, poNumber, purchaseRequestId, warehouseId, vendorId, totalAmount, taxAmount, deliveryAddress, paymentTerms, expectedDeliveryDate },
      actorId,
    );
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

async function generatePoNumber() {
  return purchaseOrderRepository.peekPoNumber();
}

async function listPurchaseOrders(companyId, pagination, filters) {
  const { rows, totalRecords } = await purchaseOrderRepository.list(companyId, pagination, filters);
  return { rows, meta: buildPaginationMeta({ page: pagination.page, limit: pagination.limit, totalRecords }) };
}

/**
 * Purchase Order Progression (plan.md Chapter 11.10): Draft -> Pending Approval ->
 * Approved -> Sent -> Acknowledged -> Partially Received (stock added to on-hand)
 * -> Completed. Cancelled forks off any state before Completed.
 */
async function transitionPurchaseOrder(companyId, id, nextStatus, actorId) {
  return withTransaction(
    async (client) => {
      const po = await purchaseOrderRepository.findByIdForUpdate(client, companyId, id);
      if (!po) throw new AppError('PO_002');

      if (nextStatus === PURCHASE_ORDER_STATUS.CANCELLED) {
        if (po.status === PURCHASE_ORDER_STATUS.COMPLETED || po.status === PURCHASE_ORDER_STATUS.CANCELLED) {
          throw new AppError('PO_001');
        }
      } else {
        assertTransition(PURCHASE_ORDER_STATUS_PIPELINE, po.status, nextStatus, 'PO_001');
      }

      if (nextStatus === PURCHASE_ORDER_STATUS.PARTIALLY_RECEIVED) {
        const items = await purchaseOrderRepository.findItems(id);
        for (const item of items) {
          await stockService.receiveStock(client, companyId, po.warehouse_id, item.product_variant_id, item.quantity);
        }
      }

      const updated = await purchaseOrderRepository.updateStatus(client, id, po.version, nextStatus, actorId);
      if (!updated) throw new AppError('PO_001', [], 'Purchase order was modified concurrently — retry the transition.');

      if (nextStatus === PURCHASE_ORDER_STATUS.COMPLETED) {
        await grnService.createGrnFromPurchaseOrder(client, companyId, updated, actorId);
      }

      return updated;
    },
    { isolationLevel: 'REPEATABLE READ' },
  );
}

module.exports = { createPurchaseOrder, getPurchaseOrder, listPurchaseOrders, transitionPurchaseOrder, generatePoNumber };
