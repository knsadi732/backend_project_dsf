const AppError = require('../utils/AppError');
const { withTransaction } = require('../config/db');
const { buildPaginationMeta } = require('../utils/pagination');
const mirRepository = require('../repositories/materialIssueRequest.repository');
const bomRepository = require('../repositories/bom.repository');
const stockRepository = require('../repositories/stock.repository');
const purchaseRequestRepository = require('../repositories/purchaseRequest.repository');

/**
 * Raised the instant a work order is created (workOrder.service.js) — a
 * snapshot of the product's BOM × the work order's quantity, requested by
 * whoever created the work order (production). Nothing is reserved and no
 * Purchase Request is raised yet — that only happens once a Production
 * Manager approves it (see `approve` below). No-op (returns null) if the
 * work order has no warehouse or the product has no BOM lines.
 */
async function createForWorkOrder(client, companyId, workOrder, actorId) {
  if (!workOrder.warehouse_id) return null;

  const bomLines = await bomRepository.listByProduct(companyId, workOrder.product_id);
  if (!bomLines.length) return null;

  const mir = await mirRepository.create(
    client,
    companyId,
    {
      workOrderId: workOrder.id,
      warehouseId: workOrder.warehouse_id,
      requestedBy: actorId,
      remarks: `Raw material for work order ${workOrder.work_order_number}`,
    },
    actorId,
  );
  const items = bomLines.map((line) => ({
    rawMaterialVariantId: line.raw_material_variant_id,
    quantityRequired: Number(line.quantity_per_unit) * Number(workOrder.quantity),
  }));
  await mirRepository.createItems(client, mir.id, items);
  return mir;
}

async function getMaterialIssueRequest(companyId, id) {
  const mir = await mirRepository.findById(companyId, id);
  if (!mir) throw new AppError('MIR_002');
  const items = await mirRepository.findItems(id);
  return { ...mir, items };
}

async function listMaterialIssueRequests(companyId, pagination, filters) {
  const { rows, totalRecords } = await mirRepository.list(companyId, pagination, filters);
  return { rows, meta: buildPaginationMeta({ page: pagination.page, limit: pagination.limit, totalRecords }) };
}

/**
 * Production Manager approval — this is the moment warehouse/inventory
 * actually sees the request: checks real stock per raw-material line,
 * reserves whatever's on hand, and bundles anything short into a single
 * high-priority Purchase Request (requested in the original requester's
 * name, i.e. production). All atomic with the status flip to "approved".
 */
async function approve(companyId, id, actorId) {
  return withTransaction(async (client) => {
    const mir = await mirRepository.findByIdForUpdate(client, companyId, id);
    if (!mir) throw new AppError('MIR_002');
    if (mir.status !== 'pending_approval') throw new AppError('MIR_001');

    const items = await mirRepository.findItems(id, (text, params) => client.query(text, params));
    const shortfallItems = [];
    for (const item of items) {
      const stock = await stockRepository.lockOrCreateForUpdate(client, companyId, mir.warehouse_id, item.raw_material_variant_id);
      const available = Math.max(Number(stock.quantity_on_hand) - Number(stock.quantity_reserved), 0);
      const reserveQty = Math.min(Number(item.quantity_required), available);

      if (reserveQty > 0) {
        await stockRepository.setQuantities(client, stock.id, {
          quantityOnHand: stock.quantity_on_hand,
          quantityReserved: Number(stock.quantity_reserved) + reserveQty,
        });
      }
      await mirRepository.setItemReserved(client, item.id, reserveQty);

      const shortfall = Number(item.quantity_required) - reserveQty;
      if (shortfall > 0) {
        shortfallItems.push({
          productVariantId: item.raw_material_variant_id,
          quantity: shortfall,
          remarks: `Auto-raised: ${mir.mir_number} approved with a raw material shortfall`,
        });
      }
    }

    if (shortfallItems.length) {
      const pr = await purchaseRequestRepository.create(
        client,
        companyId,
        {
          warehouseId: mir.warehouse_id,
          requestedBy: mir.requested_by,
          priority: 'high',
          remarks: `Auto-raised: raw material shortfall for ${mir.mir_number} (work order ${mir.work_order_id})`,
        },
        actorId,
      );
      await purchaseRequestRepository.createItems(client, pr.id, shortfallItems);
    }

    const updated = await mirRepository.updateStatus(client, id, mir.version, { status: 'approved', approvedBy: actorId }, actorId);
    if (!updated) throw new AppError('MIR_001', [], 'Material issue request was modified concurrently — retry the approval.');
    return updated;
  });
}

async function reject(companyId, id, actorId) {
  return withTransaction(async (client) => {
    const mir = await mirRepository.findByIdForUpdate(client, companyId, id);
    if (!mir) throw new AppError('MIR_002');
    if (mir.status !== 'pending_approval') throw new AppError('MIR_001');

    const updated = await mirRepository.updateStatus(client, id, mir.version, { status: 'rejected' }, actorId);
    if (!updated) throw new AppError('MIR_001', [], 'Material issue request was modified concurrently — retry the rejection.');
    return updated;
  });
}

/**
 * Manual, explicit "material has physically left the warehouse for
 * production" step — separate from `approve` on purpose (mirrors Orders:
 * confirm reserves, dispatch is the actual deduction). Only ever moves
 * `quantity_reserved` per line (recorded on the item at approval time, not
 * `quantity_required` — the shortfall portion was never reserved) into an
 * on-hand deduction; never issues more than was actually reserved.
 */
async function issue(companyId, id, actorId) {
  return withTransaction(async (client) => {
    const mir = await mirRepository.findByIdForUpdate(client, companyId, id);
    if (!mir) throw new AppError('MIR_002');
    if (mir.status !== 'approved') throw new AppError('MIR_001');

    const items = await mirRepository.findItems(id, (text, params) => client.query(text, params));
    for (const item of items) {
      const reservedQty = Number(item.quantity_reserved);
      if (reservedQty <= 0) continue;

      const stock = await stockRepository.lockOrCreateForUpdate(client, companyId, mir.warehouse_id, item.raw_material_variant_id);
      await stockRepository.setQuantities(client, stock.id, {
        quantityOnHand: Number(stock.quantity_on_hand) - reservedQty,
        quantityReserved: Math.max(Number(stock.quantity_reserved) - reservedQty, 0),
      });
    }

    const updated = await mirRepository.updateStatus(client, id, mir.version, { status: 'issued' }, actorId);
    if (!updated) throw new AppError('MIR_001', [], 'Material issue request was modified concurrently — retry marking it issued.');
    return updated;
  });
}

module.exports = {
  createForWorkOrder,
  getMaterialIssueRequest,
  listMaterialIssueRequests,
  approve,
  reject,
  issue,
};
