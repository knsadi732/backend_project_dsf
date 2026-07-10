const AppError = require('../utils/AppError');
const { buildPaginationMeta } = require('../utils/pagination');
const warehouseRepository = require('../repositories/warehouse.repository');

async function listWarehouses(companyId, pagination, filters) {
  const { rows, totalRecords } = await warehouseRepository.list(companyId, pagination, filters);
  return { rows, meta: buildPaginationMeta({ page: pagination.page, limit: pagination.limit, totalRecords }) };
}

async function getWarehouse(companyId, id) {
  const warehouse = await warehouseRepository.findById(companyId, id);
  if (!warehouse) throw new AppError('COMMON_001');
  return warehouse;
}

async function createWarehouse(companyId, payload, actorId) {
  return warehouseRepository.create(companyId, payload, actorId);
}

async function updateWarehouse(companyId, id, payload, actorId) {
  const warehouse = await warehouseRepository.update(companyId, id, payload, actorId);
  if (!warehouse) throw new AppError('COMMON_001');
  return warehouse;
}

async function deleteWarehouse(companyId, id, actorId) {
  const deleted = await warehouseRepository.softDelete(companyId, id, actorId);
  if (!deleted) throw new AppError('COMMON_001');
}

module.exports = { listWarehouses, getWarehouse, createWarehouse, updateWarehouse, deleteWarehouse };
