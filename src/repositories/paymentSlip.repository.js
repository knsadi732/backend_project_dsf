const crypto = require('crypto');
const { query } = require('../config/db');
const { buildListQuery } = require('../utils/queryBuilder');

function generateSlipNumber() {
  return `PS-${Date.now()}-${crypto.randomBytes(2).toString('hex').toUpperCase()}`;
}

async function create(client, companyId, { orderId, customerId, amount, paymentMode, issuedBy }, createdBy) {
  const { rows } = await client.query(
    `INSERT INTO payment_slips (company_id, order_id, customer_id, slip_number, amount, payment_mode, issued_by, created_by, updated_by)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $8)
     RETURNING *`,
    [companyId, orderId || null, customerId, generateSlipNumber(), amount, paymentMode || 'cash', issuedBy, createdBy],
  );
  return rows[0];
}

async function list(companyId, pagination) {
  const { dataSql, dataParams, countSql, countParams } = buildListQuery({
    table: 'payment_slips',
    companyId,
    pagination,
    searchableColumns: ['slip_number'],
  });
  const [data, count] = await Promise.all([query(dataSql, dataParams), query(countSql, countParams)]);
  return { rows: data.rows, totalRecords: parseInt(count.rows[0].count, 10) };
}

module.exports = { create, list };
