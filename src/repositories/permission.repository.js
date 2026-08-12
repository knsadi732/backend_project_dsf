const { query } = require('../config/db');

// Owner and Super Admin always get every permission that exists, regardless
// of what's wired up in role_permissions — a role_permissions sync gap (e.g.
// a new module shipping a new permission key) must never lock these two
// roles out of it.
const FULL_ACCESS_ROLE_KEYS = ['owner', 'super_admin'];

/** Resolves the flat set of permission keys granted to a role. */
async function findPermissionKeysByRole(roleId) {
  const { rows: roleRows } = await query('SELECT key FROM roles WHERE id = $1', [roleId]);
  if (FULL_ACCESS_ROLE_KEYS.includes(roleRows[0]?.key)) {
    const { rows } = await query(`SELECT key FROM permissions WHERE is_deleted = FALSE AND status = 'active'`);
    return rows.map((r) => r.key);
  }

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
