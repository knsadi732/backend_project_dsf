const AppError = require('../utils/AppError');
const { buildPaginationMeta } = require('../utils/pagination');
const binRepository = require('../repositories/bin.repository');

async function listBins(companyId, pagination, filters) {
  const { rows, totalRecords } = await binRepository.list(companyId, pagination, filters);
  return { rows, meta: buildPaginationMeta({ page: pagination.page, limit: pagination.limit, totalRecords }) };
}

async function getBin(companyId, id) {
  const bin = await binRepository.findById(companyId, id);
  if (!bin) throw new AppError('COMMON_001');
  return bin;
}

async function createBin(companyId, payload, actorId) {
  return binRepository.create(companyId, payload, actorId);
}

async function updateBin(companyId, id, payload, actorId) {
  const bin = await binRepository.update(companyId, id, payload, actorId);
  if (!bin) throw new AppError('COMMON_001');
  return bin;
}

async function deleteBin(companyId, id, actorId) {
  const deleted = await binRepository.softDelete(companyId, id, actorId);
  if (!deleted) throw new AppError('COMMON_001');
}

module.exports = { listBins, getBin, createBin, updateBin, deleteBin };
