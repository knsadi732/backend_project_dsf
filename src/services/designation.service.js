const AppError = require('../utils/AppError');
const { buildPaginationMeta } = require('../utils/pagination');
const designationRepository = require('../repositories/designation.repository');

async function listDesignations(companyId, pagination) {
  const { rows, totalRecords } = await designationRepository.list(companyId, pagination);
  return { rows, meta: buildPaginationMeta({ page: pagination.page, limit: pagination.limit, totalRecords }) };
}

async function getDesignation(companyId, id) {
  const designation = await designationRepository.findById(companyId, id);
  if (!designation) throw new AppError('COMMON_001');
  return designation;
}

async function createDesignation(companyId, payload, actorId) {
  return designationRepository.create(companyId, payload, actorId);
}

async function updateDesignation(companyId, id, payload, actorId) {
  const designation = await designationRepository.update(companyId, id, payload, actorId);
  if (!designation) throw new AppError('COMMON_001');
  return designation;
}

async function deleteDesignation(companyId, id, actorId) {
  const deleted = await designationRepository.softDelete(companyId, id, actorId);
  if (!deleted) throw new AppError('COMMON_001');
}

module.exports = { listDesignations, getDesignation, createDesignation, updateDesignation, deleteDesignation };
