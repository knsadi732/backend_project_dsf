const asyncHandler = require('../utils/asyncHandler');
const { sendSuccess } = require('../utils/response');
const { withTransaction } = require('../config/db');
const categoryService = require('../services/productCategory.service');
const productService = require('../services/product.service');
const stockService = require('../services/stock.service');

const listCategories = asyncHandler(async (req, res) => {
  const { rows, meta } = await categoryService.listCategories(req.tenant.companyId, req.pagination);
  return sendSuccess(res, { message: 'Product categories.', data: rows, meta });
});

const createCategory = asyncHandler(async (req, res) => {
  const category = await categoryService.createCategory(req.tenant.companyId, req.body, req.user.id);
  return sendSuccess(res, { message: 'Category created.', data: category, statusCode: 201 });
});

const updateCategory = asyncHandler(async (req, res) => {
  const category = await categoryService.updateCategory(req.tenant.companyId, req.params.id, req.body, req.user.id);
  return sendSuccess(res, { message: 'Category updated.', data: category });
});

const deleteCategory = asyncHandler(async (req, res) => {
  await categoryService.deleteCategory(req.tenant.companyId, req.params.id, req.user.id);
  return sendSuccess(res, { message: 'Category deleted.' });
});

const listProducts = asyncHandler(async (req, res) => {
  const { rows, meta } = await productService.listProducts(req.tenant.companyId, req.pagination, {
    categoryId: req.query.category_id,
  });
  return sendSuccess(res, { message: 'Products list.', data: rows, meta });
});

const getProduct = asyncHandler(async (req, res) => {
  const product = await productService.getProduct(req.tenant.companyId, req.params.id);
  return sendSuccess(res, { message: 'Product detail.', data: product });
});

const createProduct = asyncHandler(async (req, res) => {
  const product = await productService.createProduct(req.tenant.companyId, req.body, req.user.id);
  return sendSuccess(res, { message: 'Product created.', data: product, statusCode: 201 });
});

const updateProduct = asyncHandler(async (req, res) => {
  const product = await productService.updateProduct(req.tenant.companyId, req.params.id, req.body, req.user.id);
  return sendSuccess(res, { message: 'Product updated.', data: product });
});

const deleteProduct = asyncHandler(async (req, res) => {
  await productService.deleteProduct(req.tenant.companyId, req.params.id, req.user.id);
  return sendSuccess(res, { message: 'Product deleted.' });
});

const listStock = asyncHandler(async (req, res) => {
  const { rows, meta } = await stockService.listStock(
    req.tenant.companyId,
    req.pagination,
    req.query.warehouse_id,
    req.query.inventory_category,
  );
  return sendSuccess(res, { message: 'Warehouse stock.', data: rows, meta });
});

const getStockSummary = asyncHandler(async (req, res) => {
  const summary = await stockService.getStockSummary(req.tenant.companyId, req.query.warehouse_id);
  return sendSuccess(res, { message: 'Stock summary by inventory category.', data: summary });
});

const receiveStock = asyncHandler(async (req, res) => {
  const { warehouseId, productVariantId, quantity } = req.body;
  const stock = await withTransaction((client) =>
    stockService.receiveStock(client, req.tenant.companyId, warehouseId, productVariantId, quantity, {
      referenceType: 'manual',
      actorId: req.user.id,
      movementType: 'stock_adjustment',
    }),
  );
  return sendSuccess(res, { message: 'Stock received.', data: stock });
});

module.exports = {
  listCategories,
  createCategory,
  updateCategory,
  deleteCategory,
  listProducts,
  getProduct,
  createProduct,
  updateProduct,
  deleteProduct,
  listStock,
  getStockSummary,
  receiveStock,
};
