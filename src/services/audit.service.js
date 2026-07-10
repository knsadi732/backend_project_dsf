const { buildPaginationMeta } = require('../utils/pagination');
const auditRepository = require('../repositories/audit.repository');

async function listAuditLogs(companyId, pagination) {
  const { rows, totalRecords } = await auditRepository.list(companyId, pagination);
  return { rows, meta: buildPaginationMeta({ page: pagination.page, limit: pagination.limit, totalRecords }) };
}

module.exports = { listAuditLogs };
