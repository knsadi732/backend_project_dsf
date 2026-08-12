const AppError = require('../utils/AppError');
const { buildPaginationMeta } = require('../utils/pagination');
const stockRepository = require('../repositories/stock.repository');
const workOrderService = require('./workOrder.service');

/**
 * All mutators here take an already-open transaction `client` — they are
 * composed inside order/purchase-order services so stock movement and the
 * originating document commit atomically (plan.md Chapter 4).
 */
async function reserveStock(client, companyId, warehouseId, productVariantId, quantity) {
  const stock = await stockRepository.lockOrCreateForUpdate(client, companyId, warehouseId, productVariantId);
  const available = Number(stock.quantity_on_hand) - Number(stock.quantity_reserved);
  if (available < Number(quantity)) throw new AppError('INV_001');

  return stockRepository.setQuantities(client, stock.id, {
    quantityOnHand: stock.quantity_on_hand,
    quantityReserved: Number(stock.quantity_reserved) + Number(quantity),
  });
}

/**
 * Same as reserveStock but never throws — reserves whatever's actually
 * available (capped there) and reports the rest as `shortfall` instead of
 * blocking. Order confirmation uses this: a short order still confirms,
 * with the gap flagged as a work order rather than failing outright.
 */
async function reserveAvailable(client, companyId, warehouseId, productVariantId, quantity) {
  const stock = await stockRepository.lockOrCreateForUpdate(client, companyId, warehouseId, productVariantId);
  const available = Math.max(Number(stock.quantity_on_hand) - Number(stock.quantity_reserved), 0);
  const required = Number(quantity);
  const reserveQty = Math.min(required, available);
  const shortfall = required - reserveQty;

  const updated = await stockRepository.setQuantities(client, stock.id, {
    quantityOnHand: stock.quantity_on_hand,
    quantityReserved: Number(stock.quantity_reserved) + reserveQty,
  });
  return { stock: updated, shortfall };
}

async function releaseReservation(client, companyId, warehouseId, productVariantId, quantity) {
  const stock = await stockRepository.lockOrCreateForUpdate(client, companyId, warehouseId, productVariantId);
  const nextReserved = Math.max(Number(stock.quantity_reserved) - Number(quantity), 0);

  return stockRepository.setQuantities(client, stock.id, {
    quantityOnHand: stock.quantity_on_hand,
    quantityReserved: nextReserved,
  });
}

/**
 * Converts a held reservation into an actual on-hand deduction (dispatch).
 * This is the one place on-hand quantity actually decreases, so it's also
 * where a dip below the low-stock threshold gets caught and a replenishment
 * work order raised (workOrder.service.js checkLowStockAndReplenish).
 */
async function fulfillReservation(client, companyId, warehouseId, productVariantId, quantity, actorId) {
  const stock = await stockRepository.lockOrCreateForUpdate(client, companyId, warehouseId, productVariantId);
  const nextOnHand = Number(stock.quantity_on_hand) - Number(quantity);
  const nextReserved = Math.max(Number(stock.quantity_reserved) - Number(quantity), 0);

  const updated = await stockRepository.setQuantities(client, stock.id, { quantityOnHand: nextOnHand, quantityReserved: nextReserved });

  const { rows } = await client.query('SELECT product_id FROM product_variants WHERE id = $1', [productVariantId]);
  if (rows[0]) {
    await workOrderService.checkLowStockAndReplenish(client, companyId, rows[0].product_id, productVariantId, nextOnHand, actorId);
  }

  return updated;
}

async function receiveStock(client, companyId, warehouseId, productVariantId, quantity) {
  const stock = await stockRepository.lockOrCreateForUpdate(client, companyId, warehouseId, productVariantId);
  return stockRepository.setQuantities(client, stock.id, {
    quantityOnHand: Number(stock.quantity_on_hand) + Number(quantity),
    quantityReserved: stock.quantity_reserved,
  });
}

async function getStock(companyId, warehouseId, productVariantId) {
  return stockRepository.getStock(companyId, warehouseId, productVariantId);
}

async function listStock(companyId, pagination, warehouseId, inventoryCategory) {
  const { rows, totalRecords } = await stockRepository.listByWarehouse(companyId, pagination, warehouseId, inventoryCategory);
  return { rows, meta: buildPaginationMeta({ page: pagination.page, limit: pagination.limit, totalRecords }) };
}

async function getStockSummary(companyId, warehouseId) {
  return stockRepository.summarizeByCategory(companyId, warehouseId);
}

module.exports = {
  reserveStock,
  reserveAvailable,
  releaseReservation,
  fulfillReservation,
  receiveStock,
  getStock,
  listStock,
  getStockSummary,
};
