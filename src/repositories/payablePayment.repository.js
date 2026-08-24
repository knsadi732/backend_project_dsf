const { query } = require('../config/db');

async function create(client, companyId, { payableId, amount, paidAt, remarks }, createdBy) {
  const { rows } = await client.query(
    `INSERT INTO payable_payments (company_id, payable_id, amount, paid_at, remarks, created_by, updated_by)
     VALUES ($1, $2, $3, COALESCE($4, now()), $5, $6, $6)
     RETURNING *`,
    [companyId, payableId, amount, paidAt || null, remarks || null, createdBy],
  );
  return rows[0];
}

async function list(companyId, pagination, { payableId }) {
  const { limit, offset } = pagination;
  const [data, count] = await Promise.all([
    query(
      `SELECT * FROM payable_payments
       WHERE company_id = $1 AND payable_id = $2 AND is_deleted = FALSE
       ORDER BY paid_at DESC
       LIMIT $3 OFFSET $4`,
      [companyId, payableId, limit, offset],
    ),
    query(
      `SELECT COUNT(*) FROM payable_payments WHERE company_id = $1 AND payable_id = $2 AND is_deleted = FALSE`,
      [companyId, payableId],
    ),
  ]);
  return { rows: data.rows, totalRecords: parseInt(count.rows[0].count, 10) };
}

module.exports = { create, list };
