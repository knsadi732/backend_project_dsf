const fs = require('fs');
const path = require('path');
const env = require('../src/config/env');
const { pool } = require('../src/config/db');

/**
 * Wipes all transactional/master data (see src/database/scripts/reset_transactional_data.sql)
 * except the employee/org/RBAC module. Guarded to local dev only — this is destructive and
 * has no undo.
 */
async function main() {
  if (env.db.host !== 'localhost') {
    throw new Error(`Refusing to run: PGHOST is "${env.db.host}", not "localhost".`);
  }

  const sql = fs.readFileSync(
    path.join(__dirname, '../src/database/scripts/reset_transactional_data.sql'),
    'utf8',
  );
  await pool.query(sql);
  console.log('Transactional/master data cleared. Employee/org/RBAC module left untouched.');
  await pool.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
