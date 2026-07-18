const { pool, query } = require('../src/config/db');

async function main() {
  const { rows } = await query(
    `WITH ordered AS (
       SELECT id, department, ROW_NUMBER() OVER (ORDER BY created_at) AS rn
       FROM users
       WHERE is_deleted = FALSE
     )
     UPDATE users u
     SET employee_id = 'DSF-' ||
       COALESCE(NULLIF(LEFT(regexp_replace(UPPER(o.department), '[^A-Z]', '', 'g'), 3), ''), 'GEN')
       || '-' || LPAD(o.rn::text, 4, '0'),
       updated_at = now()
     FROM ordered o
     WHERE u.id = o.id
     RETURNING u.id, u.full_name, u.department, u.employee_id`,
  );

  console.log(`Updated ${rows.length} users:`);
  for (const r of rows) console.log(`  ${r.employee_id}  ${r.full_name}  (${r.department || 'no dept'})`);

  await query(`SELECT setval('users_employee_seq', (SELECT COUNT(*) FROM users WHERE is_deleted = FALSE))`);
  console.log('Sequence resynced to row count.');

  await pool.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
