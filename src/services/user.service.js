const bcrypt = require('bcrypt');
const env = require('../config/env');
const AppError = require('../utils/AppError');
const { buildPaginationMeta } = require('../utils/pagination');
const userRepository = require('../repositories/user.repository');

async function listUsers(companyId, pagination) {
  const { rows, totalRecords } = await userRepository.list(companyId, pagination);
  return { rows, meta: buildPaginationMeta({ page: pagination.page, limit: pagination.limit, totalRecords }) };
}

async function getUser(companyId, id) {
  const user = await userRepository.findByIdScoped(companyId, id);
  if (!user) throw new AppError('USER_002');
  return user;
}

async function createUser(companyId, payload, actorId) {
  const existing = await userRepository.findActiveByEmail(payload.email);
  if (existing) throw new AppError('USER_003');

  const { additionalRoleIds = [], ...rest } = payload;
  const passwordHash = await bcrypt.hash(payload.password, env.auth.saltRounds);
  const user = await userRepository.create(companyId, { ...rest, passwordHash }, actorId);

  if (additionalRoleIds.length) {
    await userRepository.setAdditionalRoles(user.id, additionalRoleIds, actorId);
  }

  return user;
}

async function updateUser(companyId, id, payload, actorId) {
  const { additionalRoleIds, ...rest } = payload;
  const user = await userRepository.update(companyId, id, rest, actorId);
  if (!user) throw new AppError('USER_002');

  if (additionalRoleIds !== undefined) {
    await userRepository.setAdditionalRoles(id, additionalRoleIds, actorId);
  }

  return user;
}

async function deleteUser(companyId, id, actorId) {
  const deleted = await userRepository.softDelete(companyId, id, actorId);
  if (!deleted) throw new AppError('USER_002');
}

module.exports = { listUsers, getUser, createUser, updateUser, deleteUser };
