const AppError = require('../utils/AppError');
const { withTransaction } = require('../config/db');
const { buildPaginationMeta } = require('../utils/pagination');
const mirRepository = require('../repositories/materialIssueRequest.repository');
const bomRepository = require('../repositories/bom.repository');
// Raw material lives in the Item & Material Master domain (Chapter 8), not
// Product — so its stock/movements come from itemStock.repository, never
// stock.repository/inventoryMovement.repository (those are product_variant/
// warehouse_stock only).
const itemStockRepository = require('../repositories/itemStock.repository');
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
        const updatedStock = await stockRepository.setQuantities(client, stock.id, {
          quantityOnHand: stock.quantity_on_hand,
          quantityReserved: Number(stock.quantity_reserved) + reserveQty,
        });
        await inventoryMovementRepository.record(
          client,
          companyId,
          {
            warehouseId: mir.warehouse_id,
            productVariantId: item.raw_material_variant_id,
            // Not 'sales_reservation' — that name is order-specific in the
            // fixed movement-type list; this is a raw-material reservation
            // for production, closest neutral fit is stock_adjustment.
            movementType: 'stock_adjustment',
            quantityReservedChange: reserveQty,
            quantityOnHandAfter: updatedStock.quantity_on_hand,
            quantityReservedAfter: updatedStock.quantity_reserved,
            referenceType: 'material_issue_request',
            referenceId: id,
          },
          actorId,
        );
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
 * confirm reserves, dispatch is the actual deduction).
 *
 * Warehouse staff types the exact quantity they're physically handing over
 * per line (`requestedItems: [{ itemId, quantity }]`) — never auto-computed
 * — so this only ever moves what someone actually confirmed leaving the
 * building. Each requested line is capped by two things: the line's
 * remaining balance (quantity_required - quantity_issued) and what's
 * actually available (whatever's still earmarked from approval first, then
 * current on-hand beyond that — stock the shortfall PR's PO may have
 * delivered since the last call). Exceeding either fails the whole call
 * with MIR_004 rather than silently capping, so what gets recorded always
 * matches what was typed.
 *
 * Repeatable, not one-shot: production doesn't wait on a full shortfall to
 * clear before starting — a line can be left out of a given call (e.g. its
 * stock hasn't arrived yet) and picked up in a later one. Status parks at
 * "partially_issued" until every line's balance across the whole MIR hits
 * zero, only then flipping to "issued".
 */
async function issue(companyId, id, actorId, requestedItems) {
  return withTransaction(async (client) => {
    const mir = await mirRepository.findByIdForUpdate(client, companyId, id);
    if (!mir) throw new AppError('MIR_002');
    if (!['approved', 'partially_issued'].includes(mir.status)) throw new AppError('MIR_001');

    const items = await mirRepository.findItems(id, (text, params) => client.query(text, params));
    const itemsById = new Map(items.map((item) => [item.id, item]));

    for (const requested of requestedItems) {
      const item = itemsById.get(requested.itemId);
      if (!item) throw new AppError('MIR_003');

      const required = Number(item.quantity_required);
      const alreadyIssued = Number(item.quantity_issued);
      const balance = required - alreadyIssued;
      const requestedQty = Number(requested.quantity);

      if (requestedQty > balance) {
        throw new AppError(
          'MIR_004',
          [],
          `Cannot issue ${requestedQty} of ${item.raw_material_name} — only ${balance} still required (already fully covered otherwise).`,
        );
      }

      const stock = await stockRepository.lockOrCreateForUpdate(client, companyId, mir.warehouse_id, item.raw_material_variant_id);
      let onHand = Number(stock.quantity_on_hand);
      let reserved = Number(stock.quantity_reserved);

      const stillReserved = Math.max(Number(item.quantity_reserved) - alreadyIssued, 0);
      const fromReserved = Math.min(stillReserved, requestedQty);
      const remaining = requestedQty - fromReserved;

      if (remaining > 0) {
        // Total unreserved stock (onHand - reserved already excludes this
        // item's own earmarked portion, since `reserved` hasn't had
        // `fromReserved` subtracted out yet at this point).
        const available = Math.max(onHand - reserved, 0);
        if (remaining > available) {
          throw new AppError(
            'MIR_004',
            [],
            `Cannot issue ${requestedQty} of ${item.raw_material_name} — only ${fromReserved + available} currently available in stock.`,
          );
        }
      }

      onHand -= requestedQty;
      reserved = Math.max(reserved - fromReserved, 0);

      const updatedStock = await stockRepository.setQuantities(client, stock.id, { quantityOnHand: onHand, quantityReserved: reserved });
      await inventoryMovementRepository.record(
        client,
        companyId,
        {
          warehouseId: mir.warehouse_id,
          productVariantId: item.raw_material_variant_id,
          movementType: 'stock_adjustment',
          quantityChange: -requestedQty,
          quantityReservedChange: -fromReserved,
          quantityOnHandAfter: updatedStock.quantity_on_hand,
          quantityReservedAfter: updatedStock.quantity_reserved,
          referenceType: 'material_issue_request',
          referenceId: id,
          remarks: 'Raw material issued to production',
        },
        actorId,
      );
      await mirRepository.setItemIssued(client, item.id, alreadyIssued + requestedQty);
      itemsById.set(item.id, { ...item, quantity_issued: alreadyIssued + requestedQty });
    }

    const allBalanced = [...itemsById.values()].every((item) => Number(item.quantity_required) - Number(item.quantity_issued) <= 0);
    const nextStatus = allBalanced ? 'issued' : 'partially_issued';
    const updated = await mirRepository.updateStatus(client, id, mir.version, { status: nextStatus }, actorId);
    if (!updated) throw new AppError('MIR_001', [], 'Material issue request was modified concurrently — retry.');
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
