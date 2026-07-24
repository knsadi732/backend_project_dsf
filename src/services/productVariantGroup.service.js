const AppError = require('../utils/AppError');
const { buildPaginationMeta } = require('../utils/pagination');
const variantGroupRepository = require('../repositories/productVariantGroup.repository');
const productRepository = require('../repositories/product.repository');

async function listGroups(companyId, pagination, filters) {
  const { rows, totalRecords } = await variantGroupRepository.list(companyId, pagination, filters);
  return { rows, meta: buildPaginationMeta({ page: pagination.page, limit: pagination.limit, totalRecords }) };
}

async function getGroup(companyId, id) {
  const group = await variantGroupRepository.findById(companyId, id);
  if (!group) throw new AppError('COMMON_001');
  return group;
}

async function createGroup(companyId, payload, actorId) {
  const product = await productRepository.findById(companyId, payload.productId);
  if (!product) throw new AppError('INV_002');
  return variantGroupRepository.create(companyId, payload, actorId);
}

async function updateGroup(companyId, id, payload, actorId) {
  const group = await variantGroupRepository.update(companyId, id, payload, actorId);
  if (!group) throw new AppError('COMMON_001');
  return group;
}

async function deleteGroup(companyId, id, actorId) {
  const deleted = await variantGroupRepository.softDelete(companyId, id, actorId);
  if (!deleted) throw new AppError('COMMON_001');
}

module.exports = { listGroups, getGroup, createGroup, updateGroup, deleteGroup };
