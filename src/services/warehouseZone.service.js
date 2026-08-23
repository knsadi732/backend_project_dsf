const AppError = require('../utils/AppError');
const { buildPaginationMeta } = require('../utils/pagination');
const warehouseZoneRepository = require('../repositories/warehouseZone.repository');

async function listZones(companyId, pagination) {
  const { rows, totalRecords } = await warehouseZoneRepository.list(companyId, pagination);
  return { rows, meta: buildPaginationMeta({ page: pagination.page, limit: pagination.limit, totalRecords }) };
}

async function getZone(companyId, id) {
  const zone = await warehouseZoneRepository.findById(companyId, id);
  if (!zone) throw new AppError('COMMON_001');
  return zone;
}

async function createZone(companyId, payload, actorId) {
  return warehouseZoneRepository.create(companyId, payload, actorId);
}

async function updateZone(companyId, id, payload, actorId) {
  const zone = await warehouseZoneRepository.update(companyId, id, payload, actorId);
  if (!zone) throw new AppError('COMMON_001');
  return zone;
}

async function deleteZone(companyId, id, actorId) {
  const deleted = await warehouseZoneRepository.softDelete(companyId, id, actorId);
  if (!deleted) throw new AppError('COMMON_001');
}

module.exports = { listZones, getZone, createZone, updateZone, deleteZone };
