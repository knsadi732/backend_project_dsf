const AppError = require('../utils/AppError');
const { withTransaction } = require('../config/db');
const { buildPaginationMeta } = require('../utils/pagination');
const itemCategoryRepository = require('../repositories/itemCategory.repository');
const itemRepository = require('../repositories/item.repository');
const itemStockRepository = require('../repositories/itemStock.repository');
const financeService = require('./finance.service');

// Item Categories ------------------------------------------------------------

async function createItemCategory(companyId, payload, actorId) {
  return itemCategoryRepository.create(companyId, payload, actorId);
}

async function listItemCategories(companyId, pagination) {
  const { rows, totalRecords } = await itemCategoryRepository.list(companyId, pagination);
  return { rows, meta: buildPaginationMeta({ page: pagination.page, limit: pagination.limit, totalRecords }) };
}

async function getItemCategory(companyId, id) {
  const category = await itemCategoryRepository.findById(companyId, id);
  if (!category) throw new AppError('COMMON_001');
  return category;
}

async function updateItemCategory(companyId, id, payload, actorId) {
  const updated = await itemCategoryRepository.update(companyId, id, payload, actorId);
  if (!updated) throw new AppError('COMMON_001');
  return updated;
}

// Items ------------------------------------------------------------------

async function createItem(companyId, payload, actorId) {
  return itemRepository.create(companyId, payload, actorId);
}

async function listItems(companyId, pagination, filters) {
  const { rows, totalRecords } = await itemRepository.list(companyId, pagination, filters);
  return { rows, meta: buildPaginationMeta({ page: pagination.page, limit: pagination.limit, totalRecords }) };
}

async function getItem(companyId, id) {
  const item = await itemRepository.findById(companyId, id);
  if (!item) throw new AppError('COMMON_001');
  return item;
}

async function updateItem(companyId, id, payload, actorId) {
  const updated = await itemRepository.update(companyId, id, payload, actorId);
  if (!updated) throw new AppError('COMMON_001');
  return updated;
}

// Item Stock ------------------------------------------------------------------

/**
 * Manual "receive stock" action — the standalone-module equivalent of a GRN for
 * Item & Material Master items (Chapter 8 §8.7: Raw Material/Packaging/Consumable/
 * Spare Part categories route to quantity-tracked stock). When unitCost is given,
 * posts the cost as a Finance expense via the existing recordExpense path (no GL
 * logic duplicated here) so the receipt also feeds the ledger/GST/P&L reports.
 */
async function receiveStock(
  companyId,
  { warehouseId, itemId, quantity, unitCost, description, transactionDate, gstApplicable, gstAmount, gstDetail, fundingSourceId, fundingType, utrReference, paymentMode, partyName, remarks },
  actorId,
) {
  const item = await getItem(companyId, itemId);

  const movement = await withTransaction(async (client) => {
    const stock = await itemStockRepository.lockOrCreateForUpdate(client, companyId, warehouseId, itemId);
    const quantityOnHandAfter = Number(stock.quantity_on_hand) + Number(quantity);
    await itemStockRepository.setQuantities(client, stock.id, {
      quantityOnHand: quantityOnHandAfter,
      quantityReserved: stock.quantity_reserved,
    });
    return itemStockRepository.recordMovement(
      client,
      companyId,
      {
        warehouseId,
        itemId,
        movementType: 'receipt',
        quantityChange: quantity,
        quantityOnHandAfter,
        referenceType: 'manual_receipt',
        remarks,
      },
      actorId,
    );
  });

  let expense = null;
  if (unitCost) {
    expense = await financeService.recordExpense(
      companyId,
      {
        warehouseId,
        category: item.item_category_name || 'Item Purchase',
        amount: Number(unitCost) * Number(quantity),
        description: description || `Item receipt: ${item.item_name} x ${quantity} ${item.uom}`,
        transactionDate,
        partyName,
        utrReference,
        paymentMode,
        fundingSourceId,
        fundingType,
        gstApplicable,
        gstAmount,
        gstDetail,
      },
      actorId,
    );
  }

  return { movement, expense };
}

/**
 * Internal consumption (e.g. office/production use) — reduces on-hand quantity
 * without any Finance posting (money already left the ledger at receipt time).
 */
async function consumeStock(companyId, { warehouseId, itemId, quantity, remarks }, actorId) {
  return withTransaction(async (client) => {
    const stock = await itemStockRepository.lockOrCreateForUpdate(client, companyId, warehouseId, itemId);
    if (Number(stock.quantity_on_hand) < Number(quantity)) throw new AppError('INV_001');
    const quantityOnHandAfter = Number(stock.quantity_on_hand) - Number(quantity);
    await itemStockRepository.setQuantities(client, stock.id, {
      quantityOnHand: quantityOnHandAfter,
      quantityReserved: stock.quantity_reserved,
    });
    return itemStockRepository.recordMovement(
      client,
      companyId,
      {
        warehouseId,
        itemId,
        movementType: 'consumption',
        quantityChange: -Number(quantity),
        quantityOnHandAfter,
        referenceType: 'manual_consumption',
        remarks,
      },
      actorId,
    );
  });
}

async function listItemStock(companyId, pagination, filters) {
  const { rows, totalRecords } = await itemStockRepository.listStock(companyId, pagination, filters);
  return { rows, meta: buildPaginationMeta({ page: pagination.page, limit: pagination.limit, totalRecords }) };
}

async function listItemStockMovements(companyId, pagination, filters) {
  const { rows, totalRecords } = await itemStockRepository.listMovements(companyId, pagination, filters);
  return { rows, meta: buildPaginationMeta({ page: pagination.page, limit: pagination.limit, totalRecords }) };
}

module.exports = {
  createItemCategory,
  listItemCategories,
  getItemCategory,
  updateItemCategory,
  createItem,
  listItems,
  getItem,
  updateItem,
  receiveStock,
  consumeStock,
  listItemStock,
  listItemStockMovements,
};
