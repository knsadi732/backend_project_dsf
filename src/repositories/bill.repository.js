const { query } = require('../config/db');
const { buildListQuery } = require('../utils/queryBuilder');

async function create(client, companyId, { orderId, billNumber, gstAmount, totalAmount, printedBy }, createdBy) {
  const { rows } = await client.query(
    `INSERT INTO bills (company_id, order_id, bill_number, gst_amount, total_amount, printed_by, printed_at, created_by, updated_by)
     VALUES ($1, $2, $3, $4, $5, $6, now(), $7, $7)
     RETURNING *`,
    [companyId, orderId, billNumber, gstAmount, totalAmount, printedBy, createdBy],
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

async function list(companyId, pagination) {
  const { dataSql, dataParams, countSql, countParams } = buildListQuery({
    table: 'bills',
    companyId,
    pagination,
    searchableColumns: ['bill_number'],
  });
  const [data, count] = await Promise.all([query(dataSql, dataParams), query(countSql, countParams)]);
  return { rows: data.rows, totalRecords: parseInt(count.rows[0].count, 10) };
}

module.exports = { create, findByOrderId, list };
