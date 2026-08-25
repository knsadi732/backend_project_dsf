const AppError = require('../utils/AppError');
const { withTransaction } = require('../config/db');
const { buildPaginationMeta } = require('../utils/pagination');
const returnRepository = require('../repositories/return.repository');
const creditNoteRepository = require('../repositories/creditNote.repository');
const stockRepository = require('../repositories/stock.repository');
const billRepository = require('../repositories/bill.repository');
const orderRepository = require('../repositories/order.repository');
const appNotificationRepository = require('../repositories/appNotification.repository');

async function generateReturnNumber() {
  return returnRepository.peekReturnNumber();
}

async function createReturn(companyId, payload, actorId) {
  return withTransaction((client) => returnRepository.create(client, companyId, payload, actorId));
}

async function getReturn(companyId, id) {
  const returnRecord = await returnRepository.findById(companyId, id);
  if (!returnRecord) throw new AppError('RETURN_001');
  return returnRecord;
}

async function listReturns(companyId, pagination, filters) {
  const { rows, totalRecords } = await returnRepository.list(companyId, pagination, filters);
  return { rows, meta: buildPaginationMeta({ page: pagination.page, limit: pagination.limit, totalRecords }) };
}

/** Powers the Returns page's stat tiles — Total returns, Return rate, Refund amount, Replacement orders, Damage %. */
async function getReturnsSummary(companyId, filters) {
  const row = await returnRepository.summarize(companyId, filters);
  const totalReturns = Number(row.total_returns);
  return {
    totalReturns,
    customerReturns: Number(row.customer_returns),
    courierReturns: Number(row.courier_returns),
    returnRate: totalReturns ? Math.round((Number(row.resolved_returns) / totalReturns) * 100) : 0,
    refundAmount: Number(row.refund_amount),
    replacementOrders: Number(row.replacement_returns),
    damagePercent: totalReturns ? Math.round((Number(row.scrapped_returns) / totalReturns) * 100) : 0,
    scrappedAmount: Number(row.scrapped_amount),
  };
}

/**
 * Mirrors the frontend's former mock simulation (services/api/businessRules.js
 * onReturnStatusChange) as real, persisted side effects — fired only on an
 * actual status transition (re-saving the same status is a no-op):
 *  - inspection_completed + decision='restock' -> stock goes back to the
 *    warehouse (warehouse_stock.quantity_on_hand), same path work
 *    order completion uses.
 *  - inspection_completed + decision='repair'|'scrap' -> recorded on the
 *    return itself (no separate inventory bucket table yet) — return%/damage%
 *    reporting reads straight off `returns.decision`, see summarize().
 *  - resolved + resolutionType='refund' -> auto-issues a Credit Note (GST
 *    apportioned from the linked Bill's own gst_amount/total_amount ratio,
 *    if the order has a printed Bill) and flips refund_status to 'completed'.
 */
async function updateReturn(companyId, id, payload, actorId) {
  return withTransaction(async (client) => {
    const current = await returnRepository.findByIdForUpdate(client, companyId, id);
    if (!current) throw new AppError('RETURN_001');

    const updated = await returnRepository.update(client, companyId, id, current.version, payload, actorId);
    if (!updated) throw new AppError('RETURN_001', [], 'Return was modified concurrently — retry.');

    const statusChanged = payload.status && payload.status !== current.status;
    if (!statusChanged) return updated;

    await applyStatusSideEffects(client, companyId, updated, actorId);
    return updated;
  });
}

async function notify(client, companyId, actorId, { title, message, type }) {
  await appNotificationRepository.create(companyId, { userId: actorId, title, message, type, category: 'returns' }, actorId);
}

async function applyStatusSideEffects(client, companyId, updated, actorId) {
  if (['approved', 'partially_approved'].includes(updated.status)) {
    await notify(client, companyId, actorId, {
      title: 'Return approved',
      message: `${updated.return_number} ${updated.status === 'partially_approved' ? 'partially approved' : 'approved'} — awaiting pickup`,
      type: 'success',
    });
  } else if (updated.status === 'rejected') {
    await notify(client, companyId, actorId, { title: 'Return rejected', message: `${updated.return_number} rejected`, type: 'error' });
  } else if (updated.status === 'pickup_scheduled') {
    await notify(client, companyId, actorId, {
      title: 'Return pickup scheduled',
      message: `${updated.return_number} — pickup via ${updated.courier_partner || 'courier'} on ${updated.pickup_date}`,
      type: 'information',
    });
  } else if (updated.status === 'warehouse_received') {
    await notify(client, companyId, actorId, {
      title: 'Return received at warehouse',
      message: `${updated.return_number} received — awaiting quality inspection`,
      type: 'information',
    });
  } else if (updated.status === 'inspection_completed') {
    await applyInspectionDecision(client, companyId, updated, actorId);
  } else if (updated.status === 'resolved') {
    await applyResolution(client, companyId, updated, actorId);
  }
}

async function applyInspectionDecision(client, companyId, updated, actorId) {
  if (updated.decision === 'restock') {
    if (!updated.warehouse_id) throw new AppError('RETURN_002', [], 'A warehouse is required to restock a return.');
    const stock = await stockRepository.lockOrCreateForUpdate(client, companyId, updated.warehouse_id, updated.product_variant_id);
    await stockRepository.setQuantities(client, stock.id, {
      quantityOnHand: Number(stock.quantity_on_hand) + Number(updated.quantity),
      quantityReserved: stock.quantity_reserved,
    });
    await notify(client, companyId, actorId, {
      title: 'Return restocked',
      message: `${updated.return_number} passed inspection — ${updated.quantity} unit(s) restocked`,
      type: 'success',
    });
  } else if (updated.decision === 'repair') {
    await notify(client, companyId, actorId, {
      title: 'Return sent for repair',
      message: `${updated.return_number} — ${updated.quantity} unit(s) marked for repair`,
      type: 'warning',
    });
  } else if (updated.decision === 'scrap') {
    await notify(client, companyId, actorId, {
      title: 'Return scrapped',
      message: `${updated.return_number} failed inspection — ${updated.quantity} unit(s) scrapped/damaged`,
      type: 'warning',
    });
  }
}

async function applyResolution(client, companyId, updated, actorId) {
  if (updated.resolution_type === 'refund') {
    const [bill, order] = await Promise.all([
      billRepository.findByOrderId(companyId, updated.order_id),
      orderRepository.findById(companyId, updated.order_id),
    ]);
    const gstAmount = bill && Number(bill.total_amount) > 0
      ? Math.round((Number(updated.refund_amount) * Number(bill.gst_amount)) / Number(bill.total_amount))
      : 0;

    const creditNote = await creditNoteRepository.create(
      client,
      companyId,
      { returnId: updated.id, billId: bill?.id, customerId: order?.customer_id, amount: updated.refund_amount, gstAmount },
      actorId,
    );

    await client.query(`UPDATE returns SET refund_status = 'completed', updated_at = now() WHERE id = $1`, [updated.id]);
    updated.refund_status = 'completed';

    await notify(client, companyId, actorId, {
      title: 'Credit note issued',
      message: `${creditNote.credit_note_number} issued for ${updated.return_number} — ₹${Number(creditNote.amount).toLocaleString('en-IN')}`,
      type: 'success',
    });
  } else {
    await notify(client, companyId, actorId, { title: 'Return resolved', message: `${updated.return_number} resolved`, type: 'success' });
  }
}

async function deleteReturn(companyId, id, actorId) {
  const deleted = await returnRepository.softDelete(companyId, id, actorId);
  if (!deleted) throw new AppError('RETURN_001');
}

/** Per-product/category breakdown — see return.repository.js#summarizeByProduct. */
async function getReturnsSummaryByProduct(companyId, filters) {
  return returnRepository.summarizeByProduct(companyId, filters);
}

module.exports = {
  generateReturnNumber,
  createReturn,
  getReturn,
  listReturns,
  getReturnsSummary,
  getReturnsSummaryByProduct,
  updateReturn,
  deleteReturn,
};
