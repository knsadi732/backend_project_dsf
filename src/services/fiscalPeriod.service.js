const AppError = require('../utils/AppError');
const { buildPaginationMeta } = require('../utils/pagination');
const fiscalPeriodRepository = require('../repositories/fiscalPeriod.repository');

async function listPeriods(companyId, pagination) {
  const { rows, totalRecords } = await fiscalPeriodRepository.list(companyId, pagination);
  return { rows, meta: buildPaginationMeta({ page: pagination.page, limit: pagination.limit, totalRecords }) };
}

async function getPeriod(companyId, id) {
  const period = await fiscalPeriodRepository.findById(companyId, id);
  if (!period) throw new AppError('FIN_002');
  return period;
}

async function createPeriod(companyId, { periodStart, periodEnd }, actorId) {
  const overlapping = await fiscalPeriodRepository.findOverlapping(companyId, periodStart, periodEnd);
  if (overlapping.length) throw new AppError('FIN_003');
  return fiscalPeriodRepository.create(companyId, { periodStart, periodEnd }, actorId);
}

/** CA function: financial period conclusion (plan.md Chapter 2, Service-01 CA scope). */
async function closePeriod(companyId, id, actorId) {
  const period = await fiscalPeriodRepository.close(companyId, id, actorId);
  if (!period) throw new AppError('FIN_002');
  return period;
}

module.exports = { listPeriods, getPeriod, createPeriod, closePeriod };
