const AppError = require('../utils/AppError');
const { buildPaginationMeta } = require('../utils/pagination');
const shelfRepository = require('../repositories/shelf.repository');

async function listShelves(companyId, pagination, filters) {
  const { rows, totalRecords } = await shelfRepository.list(companyId, pagination, filters);
  return { rows, meta: buildPaginationMeta({ page: pagination.page, limit: pagination.limit, totalRecords }) };
}

async function getShelf(companyId, id) {
  const shelf = await shelfRepository.findById(companyId, id);
  if (!shelf) throw new AppError('COMMON_001');
  return shelf;
}

async function createShelf(companyId, payload, actorId) {
  return shelfRepository.create(companyId, payload, actorId);
}

async function updateShelf(companyId, id, payload, actorId) {
  const shelf = await shelfRepository.update(companyId, id, payload, actorId);
  if (!shelf) throw new AppError('COMMON_001');
  return shelf;
}

async function deleteShelf(companyId, id, actorId) {
  const deleted = await shelfRepository.softDelete(companyId, id, actorId);
  if (!deleted) throw new AppError('COMMON_001');
}

module.exports = { listShelves, getShelf, createShelf, updateShelf, deleteShelf };
