const AppError = require('../utils/AppError');
const { withTransaction } = require('../config/db');
const { buildPaginationMeta } = require('../utils/pagination');
const { assertTransition } = require('../utils/stateMachine');
const { ORDER_STATUS, ORDER_STATUS_PIPELINE, PAYMENT_STATUS_PIPELINE } = require('../constants/enums');
const orderRepository = require('../repositories/order.repository');
const stockService = require('./stock.service');

async function createOrder(companyId, { branchId, warehouseId, customerId, items }, actorId) {
  return withTransaction(async (client) => {
    let subtotal = 0;
    let taxAmount = 0;
    const priced = [];

    for (const item of items) {
      const { rows } = await client.query(
        `SELECT * FROM products WHERE id = $1 AND company_id = $2 AND is_deleted = FALSE`,
        [item.productId, companyId],
      );
      const product = rows[0];
      if (!product) throw new AppError('INV_002');

      const lineSubtotal = Number(product.unit_price) * Number(item.quantity);
      const lineTax = (lineSubtotal * Number(product.tax_rate)) / 100;
      subtotal += lineSubtotal;
      taxAmount += lineTax;

      priced.push({
        productId: item.productId,
        quantity: item.quantity,
        unitPrice: product.unit_price,
        taxRate: product.tax_rate,
        lineTotal: lineSubtotal + lineTax,
      });
    }

    const order = await orderRepository.create(
      client,
      companyId,
      { branchId, warehouseId, customerId, subtotal, taxAmount, totalAmount: subtotal + taxAmount },
      actorId,
    );
    await orderRepository.createItems(client, order.id, priced);
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
            await stockService.reserveStock(client, companyId, order.warehouse_id, item.product_id, item.quantity);
          } else {
            await stockService.fulfillReservation(client, companyId, order.warehouse_id, item.product_id, item.quantity);
          }
        }
      }

      const updated = await orderRepository.updateStatus(client, id, order.version, { status: nextStatus }, actorId);
      if (!updated) throw new AppError('ORDER_001', [], 'Order was modified concurrently — retry the transition.');
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
