const AppError = require('../utils/AppError');
const { withTransaction } = require('../config/db');
const { buildPaginationMeta } = require('../utils/pagination');
const { assertTransition } = require('../utils/stateMachine');
const { ORDER_STATUS, ORDER_STATUS_PIPELINE, PAYMENT_STATUS_PIPELINE } = require('../constants/enums');
const orderRepository = require('../repositories/order.repository');
const stockService = require('./stock.service');
const financeService = require('./finance.service');
const workOrderService = require('./workOrder.service');

async function createOrder(companyId, { branchId, warehouseId, customerId, items, promisedDeliveryDate }, actorId) {
  return withTransaction(async (client) => {
    let subtotal = 0;
    let taxAmount = 0;
    const priced = [];
    const productByVariantId = {};

    for (const item of items) {
      const { rows } = await client.query(
        `SELECT pv.*, p.gst_percentage
         FROM product_variants pv
         JOIN products p ON p.id = pv.product_id
         WHERE pv.id = $1 AND pv.company_id = $2 AND pv.is_deleted = FALSE`,
        [item.productVariantId, companyId],
      );
      const variant = rows[0];
      if (!variant) throw new AppError('INV_002');
      productByVariantId[item.productVariantId] = variant.product_id;

      // selling_price is GST-inclusive (the price the customer actually pays)
      // — back out the taxable value and tax from it rather than adding tax
      // on top.
      const lineInclusive = Number(variant.selling_price) * Number(item.quantity);
      const lineSubtotal = lineInclusive / (1 + Number(variant.gst_percentage) / 100);
      const lineTax = lineInclusive - lineSubtotal;
      subtotal += lineSubtotal;
      taxAmount += lineTax;

      priced.push({
        productVariantId: item.productVariantId,
        quantity: item.quantity,
        unitPrice: variant.selling_price,
        taxRate: variant.gst_percentage,
        lineTotal: lineInclusive,
      });
    }

    const order = await orderRepository.create(
      client,
      companyId,
      { branchId, warehouseId, customerId, subtotal, taxAmount, totalAmount: subtotal + taxAmount, promisedDeliveryDate },
      actorId,
    );
    await orderRepository.createItems(client, order.id, priced);

    // Raise a work order for whatever this order needs that on-hand stock
    // can't cover — production qty = required - available. Advisory only
    // (a plain read, not the pessimistic lock reserveStock takes at
    // "confirmed") since the goal here is just to flag the shortfall for
    // manufacturing, not to hold stock.
    for (const item of priced) {
      const stock = await stockService.getStock(companyId, warehouseId, item.productVariantId);
      const available = stock ? Number(stock.quantity_on_hand) - Number(stock.quantity_reserved) : 0;
      const required = Number(item.quantity);
      if (required > available) {
        const shortfall = required - Math.max(available, 0);
        await workOrderService.createShortfallWorkOrder(
          client,
          companyId,
          {
            productId: productByVariantId[item.productVariantId],
            productVariantId: item.productVariantId,
            salesOrderId: order.id,
            warehouseId,
            quantity: shortfall,
          },
          actorId,
        );
      }
    }

    return order;
  });
}

async function getOrder(companyId, id) {
  const order = await orderRepository.findById(companyId, id);
  if (!order) throw new AppError('ORDER_002');
  const items = await orderRepository.findItems(id);
  return { ...order, items };
}

async function listOrders(companyId, pagination, filters) {
  const { rows, totalRecords } = await orderRepository.list(companyId, pagination, filters);
  return { rows, meta: buildPaginationMeta({ page: pagination.page, limit: pagination.limit, totalRecords }) };
}

/**
 * Order Lifecycle Pipeline (plan.md Chapter 4): Pending -> Confirmed (stock
 * reserved) -> Packed -> Dispatched (reservation fulfilled/deducted) ->
 * Delivered -> Completed. Runs REPEATABLE READ since it touches inventory.
 *
 * Confirming never blocks on a stock shortfall — reserveAvailable reserves
 * whatever's on hand and reports the rest, and that rest becomes a work
 * order (createShortfallWorkOrder, deduped per order+product) right here in
 * the same transaction, so the sale and the resulting production need land
 * atomically together.
 */
async function transitionOrder(companyId, id, nextStatus, actorId) {
  return withTransaction(
    async (client) => {
      const order = await orderRepository.findByIdForUpdate(client, companyId, id);
      if (!order) throw new AppError('ORDER_002');
      assertTransition(ORDER_STATUS_PIPELINE, order.status, nextStatus, 'ORDER_001');

      if (nextStatus === ORDER_STATUS.CONFIRMED || nextStatus === ORDER_STATUS.DISPATCHED) {
        const items = await orderRepository.findItems(id);
        for (const item of items) {
          if (nextStatus === ORDER_STATUS.CONFIRMED) {
            const { shortfall } = await stockService.reserveAvailable(client, companyId, order.warehouse_id, item.product_variant_id, item.quantity, { referenceType: 'order', referenceId: id, actorId });
            if (shortfall > 0) {
              await workOrderService.createShortfallWorkOrder(
                client,
                companyId,
                { productId: item.product_id, productVariantId: item.product_variant_id, salesOrderId: id, warehouseId: order.warehouse_id, quantity: shortfall },
                actorId,
              );
            }
          } else {
            await stockService.fulfillReservation(client, companyId, order.warehouse_id, item.product_variant_id, item.quantity, actorId, { referenceType: 'order', referenceId: id });
          }
        }
      }

      const updated = await orderRepository.updateStatus(client, id, order.version, { status: nextStatus }, actorId);
      if (!updated) throw new AppError('ORDER_001', [], 'Order was modified concurrently — retry the transition.');

      // Dispatch is the line between a Proforma Invoice and a final Tax
      // Invoice on the sales-order PDF — auto-generate the invoice (bills
      // row) right here rather than requiring a separate manual step.
      if (nextStatus === ORDER_STATUS.DISPATCHED) {
        await financeService.createBillForOrder(client, companyId, id, actorId);
      }

      return updated;
    },
    { isolationLevel: 'REPEATABLE READ' },
  );
}

async function updatePaymentStatus(companyId, id, nextPaymentStatus, actorId) {
  return withTransaction(async (client) => {
    const order = await orderRepository.findByIdForUpdate(client, companyId, id);
    if (!order) throw new AppError('ORDER_002');
    assertTransition(PAYMENT_STATUS_PIPELINE, order.payment_status, nextPaymentStatus, 'ORDER_001');

    const updated = await orderRepository.updateStatus(client, id, order.version, { paymentStatus: nextPaymentStatus }, actorId);
    if (!updated) throw new AppError('ORDER_001', [], 'Order was modified concurrently — retry the transition.');
    return updated;
  });
}

module.exports = { createOrder, getOrder, listOrders, transitionOrder, updatePaymentStatus };
