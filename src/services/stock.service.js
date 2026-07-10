const AppError = require('../utils/AppError');
const { buildPaginationMeta } = require('../utils/pagination');
const stockRepository = require('../repositories/stock.repository');

/**
 * All mutators here take an already-open transaction `client` — they are
 * composed inside order/purchase-order services so stock movement and the
 * originating document commit atomically (plan.md Chapter 4).
 */
async function reserveStock(client, companyId, warehouseId, productId, quantity) {
  const stock = await stockRepository.lockOrCreateForUpdate(client, companyId, warehouseId, productId);
  const available = Number(stock.quantity_on_hand) - Number(stock.quantity_reserved);
  if (available < Number(quantity)) throw new AppError('INV_001');

  return stockRepository.setQuantities(client, stock.id, {
    quantityOnHand: stock.quantity_on_hand,
    quantityReserved: Number(stock.quantity_reserved) + Number(quantity),
  });
}

async function releaseReservation(client, companyId, warehouseId, productId, quantity) {
  const stock = await stockRepository.lockOrCreateForUpdate(client, companyId, warehouseId, productId);
  const nextReserved = Math.max(Number(stock.quantity_reserved) - Number(quantity), 0);

  return stockRepository.setQuantities(client, stock.id, {
    quantityOnHand: stock.quantity_on_hand,
    quantityReserved: nextReserved,
  });
}

/** Converts a held reservation into an actual on-hand deduction (dispatch). */
async function fulfillReservation(client, companyId, warehouseId, productId, quantity) {
  const stock = await stockRepository.lockOrCreateForUpdate(client, companyId, warehouseId, productId);
  const nextOnHand = Number(stock.quantity_on_hand) - Number(quantity);
  const nextReserved = Math.max(Number(stock.quantity_reserved) - Number(quantity), 0);

  return stockRepository.setQuantities(client, stock.id, { quantityOnHand: nextOnHand, quantityReserved: nextReserved });
}

async function receiveStock(client, companyId, warehouseId, productId, quantity) {
  const stock = await stockRepository.lockOrCreateForUpdate(client, companyId, warehouseId, productId);
  return stockRepository.setQuantities(client, stock.id, {
    quantityOnHand: Number(stock.quantity_on_hand) + Number(quantity),
    quantityReserved: stock.quantity_reserved,
  });
}

async function getStock(companyId, warehouseId, productId) {
  return stockRepository.getStock(companyId, warehouseId, productId);
}

async function listStock(companyId, pagination, warehouseId) {
  const { rows, totalRecords } = await stockRepository.listByWarehouse(companyId, pagination, warehouseId);
  return { rows, meta: buildPaginationMeta({ page: pagination.page, limit: pagination.limit, totalRecords }) };
}

module.exports = { reserveStock, releaseReservation, fulfillReservation, receiveStock, getStock, listStock };
