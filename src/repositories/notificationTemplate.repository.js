const { query } = require('../config/db');

async function findByKey(key) {
  const { rows } = await query(
    `SELECT * FROM notification_templates WHERE key = $1 AND is_deleted = FALSE AND status = 'active'`,
    [key],
  );
  return rows[0] || null;
}

async function list() {
  const { rows } = await query(`SELECT * FROM notification_templates WHERE is_deleted = FALSE ORDER BY key`);
  return rows;
}

module.exports = { findByKey, list };
