const AppError = require('../utils/AppError');
const { buildPaginationMeta } = require('../utils/pagination');
const rackRepository = require('../repositories/rack.repository');

async function listRacks(companyId, pagination, filters) {
  const { rows, totalRecords } = await rackRepository.list(companyId, pagination, filters);
  return { rows, meta: buildPaginationMeta({ page: pagination.page, limit: pagination.limit, totalRecords }) };
}

async function getRack(companyId, id) {
  const rack = await rackRepository.findById(companyId, id);
  if (!rack) throw new AppError('COMMON_001');
  return rack;
}

async function createRack(companyId, payload, actorId) {
  return rackRepository.create(companyId, payload, actorId);
}

async function updateRack(companyId, id, payload, actorId) {
  const rack = await rackRepository.update(companyId, id, payload, actorId);
  if (!rack) throw new AppError('COMMON_001');
  return rack;
}

async function deleteRack(companyId, id, actorId) {
  const deleted = await rackRepository.softDelete(companyId, id, actorId);
  if (!deleted) throw new AppError('COMMON_001');
}

module.exports = { listRacks, getRack, createRack, updateRack, deleteRack };
