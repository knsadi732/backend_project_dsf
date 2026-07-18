const roleRepository = require('../repositories/role.repository');

async function listRoles(companyId) {
  return roleRepository.listForCompany(companyId);
}

module.exports = { listRoles };
