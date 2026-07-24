const asyncHandler = require('../utils/asyncHandler');
const { sendSuccess } = require('../utils/response');
const variantService = require('../services/productVariant.service');

const list = asyncHandler(async (req, res) => {
  const { rows, meta } = await variantService.listVariants(req.tenant.companyId, req.pagination, {
    productId: req.query.product_id,
    status: req.query.status,
  });
  return sendSuccess(res, { message: 'Product variants list.', data: rows, meta });
});

const getOne = asyncHandler(async (req, res) => {
  const variant = await variantService.getVariant(req.tenant.companyId, req.params.id);
  return sendSuccess(res, { message: 'Product variant detail.', data: variant });
});

const create = asyncHandler(async (req, res) => {
  const variant = await variantService.createVariant(req.tenant.companyId, req.body, req.user.id);
  return sendSuccess(res, { message: 'Product variant created.', data: variant, statusCode: 201 });
});

const update = asyncHandler(async (req, res) => {
  const variant = await variantService.updateVariant(req.tenant.companyId, req.params.id, req.body, req.user.id);
  return sendSuccess(res, { message: 'Product variant updated.', data: variant });
});

const remove = asyncHandler(async (req, res) => {
  await variantService.deleteVariant(req.tenant.companyId, req.params.id, req.user.id);
  return sendSuccess(res, { message: 'Product variant deleted.' });
});

const generateSku = asyncHandler(async (req, res) => {
  const sku = await variantService.generateSku();
  return sendSuccess(res, { message: 'SKU generated.', data: { sku } });
});

module.exports = { list, getOne, create, update, remove, generateSku };
