const AppError = require('../utils/AppError');
const { buildPaginationMeta } = require('../utils/pagination');
const bomRepository = require('../repositories/bom.repository');

async function createBomLine(companyId, payload, actorId) {
  return bomRepository.create(companyId, payload, actorId);
}

async function getBomLine(companyId, id) {
  const line = await bomRepository.findById(companyId, id);
  if (!line) throw new AppError('COMMON_001');
  return line;
}

async function listBom(companyId, pagination, filters) {
  const { rows, totalRecords } = await bomRepository.list(companyId, pagination, filters);
  return { rows, meta: buildPaginationMeta({ page: pagination.page, limit: pagination.limit, totalRecords }) };
}

async function updateBomLine(companyId, id, payload, actorId) {
  const line = await bomRepository.update(companyId, id, payload, actorId);
  if (!line) throw new AppError('COMMON_001');
  return line;
}

async function deleteBomLine(companyId, id, actorId) {
  const deleted = await bomRepository.softDelete(companyId, id, actorId);
  if (!deleted) throw new AppError('COMMON_001');
}

module.exports = { createBomLine, getBomLine, listBom, updateBomLine, deleteBomLine, listByProduct: bomRepository.listByProduct };
