const { query } = require('../config/db');

async function create(client, companyId, { returnId, billId, customerId, amount, gstAmount }, createdBy) {
  const { rows } = await client.query(
    `SELECT 'DSF-CN-' || LPAD(nextval('credit_notes_seq')::text, 4, '0') AS credit_note_number`,
  );
  const creditNoteNumber = rows[0].credit_note_number;

  const { rows: inserted } = await client.query(
    `INSERT INTO credit_notes (company_id, return_id, bill_id, customer_id, credit_note_number, amount, gst_amount, created_by, updated_by)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $8)
     RETURNING *`,
    [companyId, returnId, billId || null, customerId || null, creditNoteNumber, amount, gstAmount || 0, createdBy],
  );
  return inserted[0];
}

async function findByReturnId(companyId, returnId) {
  const { rows } = await query(
    `SELECT * FROM credit_notes WHERE company_id = $1 AND return_id = $2 AND is_deleted = FALSE`,
    [companyId, returnId],
  );
  return rows[0] || null;
}

async function list(companyId, pagination) {
  const { limit, offset } = pagination;
  const [data, count] = await Promise.all([
    query(
      `SELECT cn.*, r.return_number, o.order_number, c.name AS customer_name
       FROM credit_notes cn
       JOIN returns r ON r.id = cn.return_id
       JOIN orders o ON o.id = r.order_id
       LEFT JOIN customers c ON c.id = cn.customer_id
       WHERE cn.company_id = $1 AND cn.is_deleted = FALSE
       ORDER BY cn.created_at DESC
       LIMIT $2 OFFSET $3`,
      [companyId, limit, offset],
    ),
    query(`SELECT COUNT(*) FROM credit_notes WHERE company_id = $1 AND is_deleted = FALSE`, [companyId]),
  ]);
  return { rows: data.rows, totalRecords: parseInt(count.rows[0].count, 10) };
}

module.exports = { create, findByReturnId, list };
