const asyncHandler = require('../utils/asyncHandler');
const { sendSuccess } = require('../utils/response');
const brandService = require('../services/brand.service');

const listBrands = asyncHandler(async (req, res) => {
  const { rows, meta } = await brandService.listBrands(req.tenant.companyId, req.pagination);
  return sendSuccess(res, { message: 'Brands list.', data: rows, meta });
});

const getBrand = asyncHandler(async (req, res) => {
  const brand = await brandService.getBrand(req.tenant.companyId, req.params.id);
  return sendSuccess(res, { message: 'Brand detail.', data: brand });
});

const createBrand = asyncHandler(async (req, res) => {
  const brand = await brandService.createBrand(req.tenant.companyId, req.body, req.user.id);
  return sendSuccess(res, { message: 'Brand created.', data: brand, statusCode: 201 });
});

const updateBrand = asyncHandler(async (req, res) => {
  const brand = await brandService.updateBrand(req.tenant.companyId, req.params.id, req.body, req.user.id);
  return sendSuccess(res, { message: 'Brand updated.', data: brand });
});

const deleteBrand = asyncHandler(async (req, res) => {
  await brandService.deleteBrand(req.tenant.companyId, req.params.id, req.user.id);
  return sendSuccess(res, { message: 'Brand deleted.' });
});

module.exports = { listBrands, getBrand, createBrand, updateBrand, deleteBrand };
