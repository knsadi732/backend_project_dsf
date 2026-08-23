const asyncHandler = require('../utils/asyncHandler');
const { sendSuccess } = require('../utils/response');
const itemService = require('../services/item.service');

const createItemCategory = asyncHandler(async (req, res) => {
  const category = await itemService.createItemCategory(req.tenant.companyId, req.body, req.user.id);
  return sendSuccess(res, { message: 'Item category created.', data: category, statusCode: 201 });
});

const listItemCategories = asyncHandler(async (req, res) => {
  const { rows, meta } = await itemService.listItemCategories(req.tenant.companyId, req.pagination);
  return sendSuccess(res, { message: 'Item categories list.', data: rows, meta });
});

const getItemCategory = asyncHandler(async (req, res) => {
  const category = await itemService.getItemCategory(req.tenant.companyId, req.params.id);
  return sendSuccess(res, { message: 'Item category detail.', data: category });
});

const updateItemCategory = asyncHandler(async (req, res) => {
  const category = await itemService.updateItemCategory(req.tenant.companyId, req.params.id, req.body, req.user.id);
  return sendSuccess(res, { message: 'Item category updated.', data: category });
});

const createItem = asyncHandler(async (req, res) => {
  const item = await itemService.createItem(req.tenant.companyId, req.body, req.user.id);
  return sendSuccess(res, { message: 'Item created.', data: item, statusCode: 201 });
});

const listItems = asyncHandler(async (req, res) => {
  const { rows, meta } = await itemService.listItems(req.tenant.companyId, req.pagination, {
    itemCategoryId: req.query.item_category_id,
  });
  return sendSuccess(res, { message: 'Items list.', data: rows, meta });
});

const getItem = asyncHandler(async (req, res) => {
  const item = await itemService.getItem(req.tenant.companyId, req.params.id);
  return sendSuccess(res, { message: 'Item detail.', data: item });
});

const updateItem = asyncHandler(async (req, res) => {
  const item = await itemService.updateItem(req.tenant.companyId, req.params.id, req.body, req.user.id);
  return sendSuccess(res, { message: 'Item updated.', data: item });
});

const receiveStock = asyncHandler(async (req, res) => {
  const result = await itemService.receiveStock(req.tenant.companyId, req.body, req.user.id);
  return sendSuccess(res, { message: 'Stock received.', data: result, statusCode: 201 });
});

const consumeStock = asyncHandler(async (req, res) => {
  const movement = await itemService.consumeStock(req.tenant.companyId, req.body, req.user.id);
  return sendSuccess(res, { message: 'Stock consumed.', data: movement, statusCode: 201 });
});

const listItemStock = asyncHandler(async (req, res) => {
  const { rows, meta } = await itemService.listItemStock(req.tenant.companyId, req.pagination, {
    warehouseId: req.query.warehouse_id,
    itemId: req.query.item_id,
  });
  return sendSuccess(res, { message: 'Item stock list.', data: rows, meta });
});

const listItemStockMovements = asyncHandler(async (req, res) => {
  const { rows, meta } = await itemService.listItemStockMovements(req.tenant.companyId, req.pagination, {
    itemId: req.query.item_id,
  });
  return sendSuccess(res, { message: 'Item stock movements list.', data: rows, meta });
});

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
