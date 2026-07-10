const AppError = require('../utils/AppError');
const { buildPaginationMeta } = require('../utils/pagination');
const customerRepository = require('../repositories/customer.repository');

async function listCustomers(companyId, pagination) {
  const { rows, totalRecords } = await customerRepository.list(companyId, pagination);
  return { rows, meta: buildPaginationMeta({ page: pagination.page, limit: pagination.limit, totalRecords }) };
}

async function getCustomer(companyId, id) {
  const customer = await customerRepository.findById(companyId, id);
  if (!customer) throw new AppError('COMMON_001');
  return customer;
}

async function createCustomer(companyId, payload, actorId) {
  return customerRepository.create(companyId, payload, actorId);
}

async function updateCustomer(companyId, id, payload, actorId) {
  const customer = await customerRepository.update(companyId, id, payload, actorId);
  if (!customer) throw new AppError('COMMON_001');
  return customer;
}

async function deleteCustomer(companyId, id, actorId) {
  const deleted = await customerRepository.softDelete(companyId, id, actorId);
  if (!deleted) throw new AppError('COMMON_001');
}

module.exports = { listCustomers, getCustomer, createCustomer, updateCustomer, deleteCustomer };
