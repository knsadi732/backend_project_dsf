const { query } = require('../config/db');

async function create(companyId, { branchId, chargeType, loanId, description, category, fixedAmount, dayOfMonth, remarks }, createdBy) {
  const { rows } = await query(
    `INSERT INTO recurring_charges (company_id, branch_id, charge_type, loan_id, description, category, fixed_amount, day_of_month, remarks, created_by, updated_by)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $10)
     RETURNING *`,
    [companyId, branchId || null, chargeType, loanId || null, description, category || null, fixedAmount ?? null, dayOfMonth, remarks || null, createdBy],
  );
  return rows[0];
}

async function list(companyId, pagination) {
  const { limit, offset } = pagination;
  const { rows: data } = await query(
    `SELECT rc.*, l.loan_number, l.lender_name
     FROM recurring_charges rc
     LEFT JOIN loans l ON l.id = rc.loan_id
     WHERE rc.company_id = $1 AND rc.is_deleted = FALSE
     ORDER BY rc.day_of_month, rc.created_at DESC
     LIMIT $2 OFFSET $3`,
    [companyId, limit, offset],
  );
  const { rows: count } = await query(`SELECT COUNT(*) FROM recurring_charges WHERE company_id = $1 AND is_deleted = FALSE`, [companyId]);
  return { rows: data, totalRecords: parseInt(count[0].count, 10) };
}

/** Every active charge due today (day_of_month matches, not already posted for this calendar month) — across ALL companies, since the job runs system-wide. */
async function findDueToday(dayOfMonth, monthStart) {
  const { rows } = await query(
    `SELECT rc.*, l.principal_amount, l.interest_rate, l.interest_type, l.loan_number
     FROM recurring_charges rc
     LEFT JOIN loans l ON l.id = rc.loan_id
     WHERE rc.is_active = TRUE AND rc.is_deleted = FALSE AND rc.day_of_month = $1
       AND (rc.last_posted_month IS NULL OR rc.last_posted_month < $2)
       AND (rc.charge_type != 'loan_interest' OR l.status = 'active')`,
    [dayOfMonth, monthStart],
  );
  return rows;
}

async function markPosted(client, id, monthStart) {
  await client.query(`UPDATE recurring_charges SET last_posted_month = $2, updated_at = now() WHERE id = $1`, [id, monthStart]);
}

async function softDelete(companyId, id, deletedBy) {
  const { rows } = await query(
    `UPDATE recurring_charges SET is_deleted = TRUE, deleted_at = now(), deleted_by = $3
     WHERE id = $1 AND company_id = $2 AND is_deleted = FALSE
     RETURNING id`,
    [id, companyId, deletedBy],
  );
  return rows[0] || null;
}

module.exports = { create, list, findDueToday, markPosted, softDelete };
