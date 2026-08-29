const AppError = require('../utils/AppError');
const { withTransaction } = require('../config/db');
const { buildPaginationMeta } = require('../utils/pagination');
const itemCategoryRepository = require('../repositories/itemCategory.repository');
const itemRepository = require('../repositories/item.repository');
const itemVariantRepository = require('../repositories/itemVariant.repository');
const itemStockRepository = require('../repositories/itemStock.repository');
const financeService = require('./finance.service');

// Item Categories ------------------------------------------------------------

async function generateCategoryCode() {
  return itemCategoryRepository.peekCategoryCode();
}

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

async function generateItemCode() {
  return itemRepository.peekItemCode();
}

/**
 * Creating an Item always creates its first Variant in the same breath — a
 * bare Item has nowhere to hold stock (Chapter 8 §8.7 routes purchases to
 * quantity-tracked stock, which now lives on the Variant, not the Item), so
 * a brand-new Item would otherwise be immediately useless until a Variant is
 * added separately. `size`/`color` here seed that first Variant; everything
 * else on the payload belongs to the Item itself.
 */
async function createItem(companyId, { size, color, ...itemPayload }, actorId) {
  return withTransaction(async (client) => {
    const item = await itemRepository.create(companyId, itemPayload, actorId, client);
    const variant = await itemVariantRepository.create(companyId, { itemId: item.id, size, color }, actorId, client);
    return { ...item, variants: [variant] };
  });
}

async function listItems(companyId, pagination, filters) {
  const { rows, totalRecords } = await itemRepository.list(companyId, pagination, filters);
  return { rows, meta: buildPaginationMeta({ page: pagination.page, limit: pagination.limit, totalRecords }) };
}

async function getItem(companyId, id) {
  const item = await itemRepository.findById(companyId, id);
  if (!item) throw new AppError('COMMON_001');
  const { rows: variants } = await itemVariantRepository.list(companyId, { page: 1, limit: 200, offset: 0 }, { itemId: id });
  return { ...item, variants };
}

async function updateItem(companyId, id, payload, actorId) {
  const updated = await itemRepository.update(companyId, id, payload, actorId);
  if (!updated) throw new AppError('COMMON_001');
  return updated;
}

// Item Variants (Chapter 8 — Item -> Variant -> SKU, mirrors Product -> Product Variant) ------

async function generateItemVariantSku() {
  return itemVariantRepository.peekSku();
}

async function createItemVariant(companyId, payload, actorId) {
  const item = await getItem(companyId, payload.itemId);
  if (!item) throw new AppError('COMMON_001');
  return itemVariantRepository.create(companyId, payload, actorId);
}

async function listItemVariants(companyId, pagination, filters) {
  const { rows, totalRecords } = await itemVariantRepository.list(companyId, pagination, filters);
  return { rows, meta: buildPaginationMeta({ page: pagination.page, limit: pagination.limit, totalRecords }) };
}

async function getItemVariant(companyId, id) {
  const variant = await itemVariantRepository.findById(companyId, id);
  if (!variant) throw new AppError('COMMON_001');
  return variant;
}

async function updateItemVariant(companyId, id, payload, actorId) {
  const updated = await itemVariantRepository.update(companyId, id, payload, actorId);
  if (!updated) throw new AppError('COMMON_001');
  return updated;
}

// Item Stock ------------------------------------------------------------------

/**
 * Manual "receive stock" action — the standalone-module equivalent of a GRN for
 * Item & Material Master item VARIANTS (Chapter 8 §8.7: Raw Material/Packaging/
 * Consumable/Spare Part categories route to quantity-tracked stock, tracked per
 * Variant). When unitCost is given, posts the cost as a Finance expense via the
 * existing recordExpense path (no GL logic duplicated here) so the receipt also
 * feeds the ledger/GST/P&L reports.
 */
async function receiveStock(
  companyId,
  { warehouseId, itemVariantId, quantity, unitCost, description, transactionDate, gstApplicable, gstAmount, gstDetail, fundingSourceId, fundingType, utrReference, paymentMode, partyName, remarks },
  actorId,
) {
  const variant = await getItemVariant(companyId, itemVariantId);

  const movement = await withTransaction(async (client) => {
    const stock = await itemStockRepository.lockOrCreateForUpdate(client, companyId, warehouseId, itemVariantId);
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
        itemVariantId,
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
        category: variant.item_category_name || 'Item Purchase',
        amount: Number(unitCost) * Number(quantity),
        description: description || `Item receipt: ${variant.item_name} (${variant.sku}) x ${quantity} ${variant.uom}`,
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
async function consumeStock(companyId, { warehouseId, itemVariantId, quantity, remarks }, actorId) {
  return withTransaction(async (client) => {
    const stock = await itemStockRepository.lockOrCreateForUpdate(client, companyId, warehouseId, itemVariantId);
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
        itemVariantId,
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

/**
 * Stock-only credit for an Item Master Variant received via a Purchase Order
 * (Chapter 12) — the item-domain equivalent of stock.service.js#receiveStock.
 * Unlike the manual receiveStock() above, this never posts a Finance expense
 * itself: a PO's cost already flows to the vendor through the normal
 * PO -> GRN -> Vendor Bill trail (vendorBill.service.js), so posting one
 * here too would double-count it. Takes the caller's own transaction
 * `client` so it commits atomically with the PO status transition.
 */
async function creditStockFromPurchase(client, companyId, warehouseId, itemVariantId, quantity, { referenceType, referenceId, actorId } = {}) {
  const stock = await itemStockRepository.lockOrCreateForUpdate(client, companyId, warehouseId, itemVariantId);
  const quantityOnHandAfter = Number(stock.quantity_on_hand) + Number(quantity);
  await itemStockRepository.setQuantities(client, stock.id, {
    quantityOnHand: quantityOnHandAfter,
    quantityReserved: stock.quantity_reserved,
  });
  return itemStockRepository.recordMovement(
    client,
    companyId,
    { warehouseId, itemVariantId, movementType: 'receipt', quantityChange: quantity, quantityOnHandAfter, referenceType, referenceId },
    actorId,
  );
}

async function listItemStockMovements(companyId, pagination, filters) {
  const { rows, totalRecords } = await itemStockRepository.listMovements(companyId, pagination, filters);
  return { rows, meta: buildPaginationMeta({ page: pagination.page, limit: pagination.limit, totalRecords }) };
}

module.exports = {
  generateCategoryCode,
  createItemCategory,
  listItemCategories,
  getItemCategory,
  updateItemCategory,
  generateItemCode,
  createItem,
  listItems,
  getItem,
  updateItem,
  generateItemVariantSku,
  createItemVariant,
  listItemVariants,
  getItemVariant,
  updateItemVariant,
  receiveStock,
  creditStockFromPurchase,
  consumeStock,
  listItemStock,
  listItemStockMovements,
};
