const AppError = require('../utils/AppError');
const companyRepository = require('../repositories/company.repository');

async function getCompany(companyId) {
  const company = await companyRepository.findById(companyId);
  if (!company) throw new AppError('COMMON_001');
  return company;
}

async function updateCompany(companyId, fields, actorId) {
  const company = await companyRepository.update(companyId, fields, actorId);
  if (!company) throw new AppError('COMMON_001');
  return company;
}

module.exports = { getCompany, updateCompany };
