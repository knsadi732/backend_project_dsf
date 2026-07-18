const { CACHE_PREFIX, CACHE_TTL_SECONDS } = require('../config/redis');
const cache = require('../redis/cache');
const permissionRepository = require('../repositories/permission.repository');
const userRepository = require('../repositories/user.repository');

/**
 * Resolves and caches a role's permission set (plan.md Chapter 6 — Permission
 * Cache tier), avoiding a recursive role_permissions/permissions JOIN on
 * every gated request.
 */
async function getPermissionKeysForRole(roleId) {
  const cacheKey = `${CACHE_PREFIX.PERMISSION}${roleId}`;
  const cached = await cache.getJSON(cacheKey);
  if (cached) return cached;

  const keys = await permissionRepository.findPermissionKeysByRole(roleId);
  await cache.setJSON(cacheKey, keys, CACHE_TTL_SECONDS.PERMISSION);
  return keys;
}

/**
 * A user may act under multiple roles (their primary users.role_id plus any
 * grants in user_roles) — permission is granted if ANY of those roles has it.
 */
async function hasPermission(userId, permissionKey) {
  const roleIds = await userRepository.findRoleIdsForUser(userId);
  for (const roleId of roleIds) {
    const keys = await getPermissionKeysForRole(roleId);
    if (keys.includes(permissionKey)) return true;
  }
  return false;
}

async function invalidateRoleCache(roleId) {
  await cache.del(`${CACHE_PREFIX.PERMISSION}${roleId}`);
}

module.exports = { getPermissionKeysForRole, hasPermission, invalidateRoleCache };
