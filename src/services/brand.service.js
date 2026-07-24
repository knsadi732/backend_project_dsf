const AppError = require('../utils/AppError');
const { buildPaginationMeta } = require('../utils/pagination');
const brandRepository = require('../repositories/brand.repository');

async function listBrands(companyId, pagination) {
  const { rows, totalRecords } = await brandRepository.list(companyId, pagination);
  return { rows, meta: buildPaginationMeta({ page: pagination.page, limit: pagination.limit, totalRecords }) };
}

async function getBrand(companyId, id) {
  const brand = await brandRepository.findById(companyId, id);
  if (!brand) throw new AppError('COMMON_001');
  return brand;
}

async function createBrand(companyId, payload, actorId) {
  return brandRepository.create(companyId, payload, actorId);
}

async function updateBrand(companyId, id, payload, actorId) {
  const brand = await brandRepository.update(companyId, id, payload, actorId);
  if (!brand) throw new AppError('COMMON_001');
  return brand;
}

async function deleteBrand(companyId, id, actorId) {
  const deleted = await brandRepository.softDelete(companyId, id, actorId);
  if (!deleted) throw new AppError('COMMON_001');
}

module.exports = { listBrands, getBrand, createBrand, updateBrand, deleteBrand };
