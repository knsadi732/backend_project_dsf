const { query } = require('../config/db');

async function findById(id) {
  const { rows } = await query(
    `SELECT id, company_id, key, name, status
     FROM roles
     WHERE id = $1 AND is_deleted = FALSE
     LIMIT 1`,
    [id],
  );
  return rows[0] || null;
}

/** Looks up a system role (company_id IS NULL) by its key, e.g. 'admin'. */
async function findSystemRoleByKey(key) {
  const { rows } = await query(
    `SELECT id, key, name, status
     FROM roles
     WHERE key = $1 AND company_id IS NULL AND is_deleted = FALSE
     LIMIT 1`,
    [key],
  );
  return rows[0] || null;
}

module.exports = { findById, findSystemRoleByKey };
