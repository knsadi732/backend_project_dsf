const AppError = require('../utils/AppError');
const { buildPaginationMeta } = require('../utils/pagination');
const departmentRepository = require('../repositories/department.repository');

async function listDepartments(companyId, pagination) {
  const { rows, totalRecords } = await departmentRepository.list(companyId, pagination);
  return { rows, meta: buildPaginationMeta({ page: pagination.page, limit: pagination.limit, totalRecords }) };
}

async function getDepartment(companyId, id) {
  const department = await departmentRepository.findById(companyId, id);
  if (!department) throw new AppError('COMMON_001');
  return department;
}

async function createDepartment(companyId, payload, actorId) {
  return departmentRepository.create(companyId, payload, actorId);
}

async function updateDepartment(companyId, id, payload, actorId) {
  const department = await departmentRepository.update(companyId, id, payload, actorId);
  if (!department) throw new AppError('COMMON_001');
  return department;
}

async function deleteDepartment(companyId, id, actorId) {
  const deleted = await departmentRepository.softDelete(companyId, id, actorId);
  if (!deleted) throw new AppError('COMMON_001');
}

module.exports = { listDepartments, getDepartment, createDepartment, updateDepartment, deleteDepartment };
