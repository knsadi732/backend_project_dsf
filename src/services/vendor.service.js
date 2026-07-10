const AppError = require('../utils/AppError');
const { buildPaginationMeta } = require('../utils/pagination');
const vendorRepository = require('../repositories/vendor.repository');

async function listVendors(companyId, pagination) {
  const { rows, totalRecords } = await vendorRepository.list(companyId, pagination);
  return { rows, meta: buildPaginationMeta({ page: pagination.page, limit: pagination.limit, totalRecords }) };
}

async function getVendor(companyId, id) {
  const vendor = await vendorRepository.findById(companyId, id);
  if (!vendor) throw new AppError('COMMON_001');
  return vendor;
}

async function createVendor(companyId, payload, actorId) {
  return vendorRepository.create(companyId, payload, actorId);
}

async function updateVendor(companyId, id, payload, actorId) {
  const vendor = await vendorRepository.update(companyId, id, payload, actorId);
  if (!vendor) throw new AppError('COMMON_001');
  return vendor;
}

async function deleteVendor(companyId, id, actorId) {
  const deleted = await vendorRepository.softDelete(companyId, id, actorId);
  if (!deleted) throw new AppError('COMMON_001');
}

module.exports = { listVendors, getVendor, createVendor, updateVendor, deleteVendor };
