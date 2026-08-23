const { buildPaginationMeta } = require('../utils/pagination');
const inventoryMovementRepository = require('../repositories/inventoryMovement.repository');

async function listMovements(companyId, pagination, filters) {
  const { rows, totalRecords } = await inventoryMovementRepository.list(companyId, pagination, filters);
  return { rows, meta: buildPaginationMeta({ page: pagination.page, limit: pagination.limit, totalRecords }) };
}

module.exports = { listMovements };
