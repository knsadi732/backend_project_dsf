const { query } = require('../config/db');
const { buildListQuery } = require('../utils/queryBuilder');

/** Resolves branch/warehouse/department/requester ids to display names alongside them —
 * raw query rather than buildListQuery since the joins make bare column names ambiguous. */
const SELECT_WITH_NAMES = `
  SELECT pr.*, b.name AS branch_name, w.name AS warehouse_name, d.name AS department_name, u.full_name AS requested_by_name
  FROM purchase_requests pr
  LEFT JOIN branches b ON b.id = pr.branch_id
  LEFT JOIN warehouses w ON w.id = pr.warehouse_id
  LEFT JOIN departments d ON d.id = pr.department_id
  LEFT JOIN users u ON u.id = pr.requested_by`;

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

async function create(
  client,
  companyId,
  { branchId, warehouseId, departmentId, requestedBy, prNumber, priority, requiredDate, remarks },
  createdBy,
) {
  const number = prNumber || (await generatePrNumber((text, params) => client.query(text, params)));
  const { rows } = await client.query(
    `INSERT INTO purchase_requests (company_id, branch_id, warehouse_id, department_id, requested_by, pr_number, priority, required_date, remarks, created_by, updated_by)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $10)
     RETURNING *`,
    [companyId, branchId || null, warehouseId, departmentId || null, requestedBy, number, priority, requiredDate || null, remarks || null, createdBy],
  );
  return rows[0];
}

async function createItems(client, purchaseRequestId, items) {
  for (const item of items) {
    await client.query(
      `INSERT INTO purchase_request_items (purchase_request_id, product_variant_id, quantity, remarks)
       VALUES ($1, $2, $3, $4)`,
      [purchaseRequestId, item.productVariantId, item.quantity, item.remarks || null],
    );
  }
}

async function findById(companyId, id) {
  const { rows } = await query(
    `${SELECT_WITH_NAMES} WHERE pr.id = $1 AND pr.company_id = $2 AND pr.is_deleted = FALSE`,
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

async function findItems(purchaseRequestId, runner = query) {
  const { rows } = await runner(
    `SELECT pri.*, pv.sku, pv.size, pv.color, p.name AS product_name
     FROM purchase_request_items pri
     LEFT JOIN product_variants pv ON pv.id = pri.product_variant_id
     LEFT JOIN products p ON p.id = pv.product_id
     WHERE pri.purchase_request_id = $1`,
    [purchaseRequestId],
  );
  return rows;
}

async function list(companyId, pagination, { status } = {}) {
  const conditions = ['pr.company_id = $1', 'pr.is_deleted = FALSE'];
  const params = [companyId];

  if (status) {
    params.push(status);
    conditions.push(`pr.status = $${params.length}`);
  }
  if (pagination.search) {
    params.push(`%${pagination.search}%`);
    conditions.push(`pr.pr_number ILIKE $${params.length}`);
  }

  const whereClause = `WHERE ${conditions.join(' AND ')}`;
  const safeSortBy = /^[a-zA-Z_]+$/.test(pagination.sortBy) ? pagination.sortBy : 'created_at';
  const safeSortOrder = pagination.sortOrder === 'asc' ? 'ASC' : 'DESC';

  const dataSql = `${SELECT_WITH_NAMES} ${whereClause} ORDER BY pr.${safeSortBy} ${safeSortOrder} LIMIT $${
    params.length + 1
  } OFFSET $${params.length + 2}`;
  const dataParams = [...params, pagination.limit, pagination.offset];
  const countSql = `SELECT COUNT(*) FROM purchase_requests pr ${whereClause}`;

  const [data, count] = await Promise.all([query(dataSql, dataParams), query(countSql, params)]);

  const prIds = data.rows.map((r) => r.id);
  let itemsByPr = {};
  if (prIds.length) {
    const { rows: items } = await query(
      `SELECT pri.*, pv.sku, pv.size, pv.color, p.name AS product_name
       FROM purchase_request_items pri
       LEFT JOIN product_variants pv ON pv.id = pri.product_variant_id
       LEFT JOIN products p ON p.id = pv.product_id
       WHERE pri.purchase_request_id = ANY($1)`,
      [prIds],
    );
    itemsByPr = items.reduce((acc, item) => {
      (acc[item.purchase_request_id] ||= []).push(item);
      return acc;
    }, {});
  }
  const rows = data.rows.map((r) => ({ ...r, items: itemsByPr[r.id] || [] }));

  return { rows, totalRecords: parseInt(count.rows[0].count, 10) };
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
