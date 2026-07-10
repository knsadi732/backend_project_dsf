const AppError = require('../utils/AppError');
const { buildPaginationMeta } = require('../utils/pagination');
const branchRepository = require('../repositories/branch.repository');

async function listBranches(companyId, pagination) {
  const { rows, totalRecords } = await branchRepository.list(companyId, pagination);
  return { rows, meta: buildPaginationMeta({ page: pagination.page, limit: pagination.limit, totalRecords }) };
}

async function getBranch(companyId, id) {
  const branch = await branchRepository.findById(companyId, id);
  if (!branch) throw new AppError('COMMON_001');
  return branch;
}

async function createBranch(companyId, payload, actorId) {
  return branchRepository.create(companyId, payload, actorId);
}

async function updateBranch(companyId, id, payload, actorId) {
  const branch = await branchRepository.update(companyId, id, payload, actorId);
  if (!branch) throw new AppError('COMMON_001');
  return branch;
}

async function deleteBranch(companyId, id, actorId) {
  const deleted = await branchRepository.softDelete(companyId, id, actorId);
  if (!deleted) throw new AppError('COMMON_001');
}

module.exports = { listBranches, getBranch, createBranch, updateBranch, deleteBranch };
