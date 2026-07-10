const AppError = require('../utils/AppError');
const { buildPaginationMeta } = require('../utils/pagination');
const categoryRepository = require('../repositories/productCategory.repository');

async function listCategories(companyId, pagination) {
  const { rows, totalRecords } = await categoryRepository.list(companyId, pagination);
  return { rows, meta: buildPaginationMeta({ page: pagination.page, limit: pagination.limit, totalRecords }) };
}

async function getCategory(companyId, id) {
  const category = await categoryRepository.findById(companyId, id);
  if (!category) throw new AppError('COMMON_001');
  return category;
}

async function createCategory(companyId, payload, actorId) {
  return categoryRepository.create(companyId, payload, actorId);
}

async function updateCategory(companyId, id, payload, actorId) {
  const category = await categoryRepository.update(companyId, id, payload, actorId);
  if (!category) throw new AppError('COMMON_001');
  return category;
}

async function deleteCategory(companyId, id, actorId) {
  const deleted = await categoryRepository.softDelete(companyId, id, actorId);
  if (!deleted) throw new AppError('COMMON_001');
}

module.exports = { listCategories, getCategory, createCategory, updateCategory, deleteCategory };
