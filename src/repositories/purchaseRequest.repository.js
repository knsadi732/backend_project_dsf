const { query } = require('../config/db');
const { buildListQuery } = require('../utils/queryBuilder');

/** Reserves and returns the next PR number, e.g. 'DSF-PR-0001'. Each call consumes the sequence. */
async function generatePrNumber(runner = query) {
  const { rows } = await runner(
    `SELECT 'DSF-PR-' || LPAD(nextval('purchase_requests_pr_seq')::text, 4, '0') AS pr_number`,
  );
  return rows[0].pr_number;
}

/** Previews the next PR number without consuming the sequence — safe to call repeatedly. */
async function peekPrNumber(runner = query) {
  const { rows } = await runner(
    `SELECT 'DSF-PR-' || LPAD((CASE WHEN is_called THEN last_value + 1 ELSE last_value END)::text, 4, '0') AS pr_number
     FROM purchase_requests_pr_seq`,
  );
  return rows[0].pr_number;
}

async function create(client, companyId, { branchId, warehouseId, departmentId, requestedBy, prNumber, remarks }, createdBy) {
  const number = prNumber || (await generatePrNumber((text, params) => client.query(text, params)));
  const { rows } = await client.query(
    `INSERT INTO purchase_requests (company_id, branch_id, warehouse_id, department_id, requested_by, pr_number, remarks, created_by, updated_by)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $8)
     RETURNING *`,
    [companyId, branchId || null, warehouseId, departmentId || null, requestedBy, number, remarks || null, createdBy],
  );
  return rows[0];
}

async function createItems(client, purchaseRequestId, items) {
  for (const item of items) {
    await client.query(
      `INSERT INTO purchase_request_items (purchase_request_id, product_id, quantity, remarks)
       VALUES ($1, $2, $3, $4)`,
      [purchaseRequestId, item.productId, item.quantity, item.remarks || null],
    );
  }
}

async function findById(companyId, id) {
  const { rows } = await query(
    `SELECT * FROM purchase_requests WHERE id = $1 AND company_id = $2 AND is_deleted = FALSE`,
    [id, companyId],
  );
  return rows[0] || null;
}

async function findByIdForUpdate(client, companyId, id) {
  const { rows } = await client.query(
    `SELECT * FROM purchase_requests WHERE id = $1 AND company_id = $2 AND is_deleted = FALSE FOR UPDATE`,
    [id, companyId],
  );
  return rows[0] || null;
}

async function findItems(purchaseRequestId) {
  const { rows } = await query(`SELECT * FROM purchase_request_items WHERE purchase_request_id = $1`, [purchaseRequestId]);
  return rows;
}

async function list(companyId, pagination, { status } = {}) {
  const extraConditions = [];
  const extraParams = [];
  if (status) {
    extraConditions.push(`status = $${extraParams.length + 2}`);
    extraParams.push(status);
  }

  const { dataSql, dataParams, countSql, countParams } = buildListQuery({
    table: 'purchase_requests',
    companyId,
    pagination,
    searchableColumns: ['pr_number'],
    extraConditions,
    extraParams,
  });
  const [data, count] = await Promise.all([query(dataSql, dataParams), query(countSql, countParams)]);
  return { rows: data.rows, totalRecords: parseInt(count.rows[0].count, 10) };
}

async function updateStatus(client, id, expectedVersion, status, updatedBy) {
  const { rows } = await client.query(
    `UPDATE purchase_requests
     SET status = $3, version = version + 1, updated_by = $4, updated_at = now()
     WHERE id = $1 AND version = $2
     RETURNING *`,
    [id, expectedVersion, status, updatedBy],
  );
  return rows[0] || null;
}

module.exports = { create, createItems, findById, findByIdForUpdate, findItems, list, updateStatus, generatePrNumber, peekPrNumber };
