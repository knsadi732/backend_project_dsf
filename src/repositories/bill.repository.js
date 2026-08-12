const { query } = require('../config/db');

async function create(client, companyId, { orderId, billNumber, customerId, gstAmount, totalAmount, dueDate, printedBy }, createdBy) {
  const { rows } = await client.query(
    `INSERT INTO bills (company_id, order_id, bill_number, customer_id, gst_amount, total_amount, balance_due, due_date, status, printed_by, printed_at, created_by, updated_by)
     VALUES ($1, $2, $3, $4, $5, $6, $6, $7, 'unpaid', $8, now(), $9, $9)
     RETURNING *`,
    [companyId, orderId, billNumber, customerId, gstAmount, totalAmount, dueDate, printedBy, createdBy],
  );
  return rows[0];
}

async function findByOrderId(companyId, orderId) {
  const { rows } = await query(
    `SELECT * FROM bills WHERE company_id = $1 AND order_id = $2 AND is_deleted = FALSE LIMIT 1`,
    [companyId, orderId],
  );
  return rows[0] || null;
}

const SELECT_WITH_JOINS = `
  SELECT b.*, c.name AS party, o.order_number AS sales_order_number
  FROM bills b
  LEFT JOIN customers c ON c.id = b.customer_id
  LEFT JOIN orders o ON o.id = b.order_id
`;

async function findById(companyId, id) {
  const { rows } = await query(
    `${SELECT_WITH_JOINS} WHERE b.id = $1 AND b.company_id = $2 AND b.is_deleted = FALSE`,
    [id, companyId],
  );
  return rows[0] || null;
}

async function list(companyId, pagination, { status, dateFrom, dateTo } = {}) {
  const { limit, offset, search } = pagination;
  const conditions = ['b.company_id = $1', 'b.is_deleted = FALSE'];
  const params = [companyId];

  if (search) {
    params.push(`%${search}%`);
    conditions.push(`(b.bill_number ILIKE $${params.length} OR c.name ILIKE $${params.length})`);
  }
  if (status) {
    params.push(status);
    conditions.push(`b.status = $${params.length}`);
  }
  if (dateFrom) {
    params.push(dateFrom);
    conditions.push(`b.due_date >= $${params.length}`);
  }
  if (dateTo) {
    params.push(dateTo);
    conditions.push(`b.due_date <= $${params.length}`);
  }

  const whereClause = `WHERE ${conditions.join(' AND ')}`;
  const dataSql = `${SELECT_WITH_JOINS} ${whereClause} ORDER BY b.created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
  const countSql = `SELECT COUNT(*) FROM bills b LEFT JOIN customers c ON c.id = b.customer_id ${whereClause}`;

  const [data, count] = await Promise.all([query(dataSql, [...params, limit, offset]), query(countSql, params)]);
  return { rows: data.rows, totalRecords: parseInt(count.rows[0].count, 10) };
}

/** balanceDue is the remaining amount after whatever's been paid so far — caller derives it from total_amount minus payments received. */
async function updateStatus(companyId, id, { status, balanceDue }, updatedBy) {
  const { rows } = await query(
    `UPDATE bills
     SET status = COALESCE($3, status), balance_due = COALESCE($4, balance_due), updated_by = $5, updated_at = now()
     WHERE id = $1 AND company_id = $2 AND is_deleted = FALSE
     RETURNING *`,
    [id, companyId, status, balanceDue, updatedBy],
  );
  return rows[0] || null;
}

module.exports = { create, findByOrderId, findById, list, updateStatus };
