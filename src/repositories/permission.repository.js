const { query } = require('../config/db');

/** Resolves the flat set of permission keys granted to a role. */
async function findPermissionKeysByRole(roleId) {
  const { rows } = await query(
    `SELECT p.key
     FROM role_permissions rp
     JOIN permissions p ON p.id = rp.permission_id AND p.is_deleted = FALSE AND p.status = 'active'
     WHERE rp.role_id = $1`,
    [roleId],
  );
  return rows.map((r) => r.key);
}

module.exports = { findPermissionKeysByRole };
