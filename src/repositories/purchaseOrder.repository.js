const { query } = require('../config/db');
const { buildListQuery } = require('../utils/queryBuilder');

/** Reserves and returns the next PO number, e.g. 'DSF-PO-0001'. Each call consumes the sequence. */
async function generatePoNumber(runner = query) {
  const { rows } = await runner(
    `SELECT 'DSF-PO-' || LPAD(nextval('purchase_orders_po_seq')::text, 4, '0') AS po_number`,
  );
  return rows[0].po_number;
}

async function create(client, companyId, { branchId, warehouseId, vendorId, totalAmount, poNumber }, createdBy) {
  const number = poNumber || (await generatePoNumber((text, params) => client.query(text, params)));
  const { rows } = await client.query(
    `INSERT INTO purchase_orders (company_id, branch_id, warehouse_id, vendor_id, po_number, total_amount, created_by, updated_by)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $7)
     RETURNING *`,
    [companyId, branchId, warehouseId, vendorId, number, totalAmount, createdBy],
  );
  return rows[0];
}

async function createItems(client, purchaseOrderId, items) {
  for (const item of items) {
    await client.query(
      `INSERT INTO purchase_order_items (purchase_order_id, product_id, quantity, unit_cost, line_total)
       VALUES ($1, $2, $3, $4, $5)`,
      [purchaseOrderId, item.productId, item.quantity, item.unitCost, item.lineTotal],
    );
  }
}

async function findById(companyId, id) {
  const { rows } = await query(
    `SELECT * FROM purchase_orders WHERE id = $1 AND company_id = $2 AND is_deleted = FALSE`,
    [id, companyId],
  );
  return rows[0] || null;
}

async function findByIdForUpdate(client, companyId, id) {
  const { rows } = await client.query(
    `SELECT * FROM purchase_orders WHERE id = $1 AND company_id = $2 AND is_deleted = FALSE FOR UPDATE`,
    [id, companyId],
  );
  return rows[0] || null;
}

async function findItems(purchaseOrderId) {
  const { rows } = await query(`SELECT * FROM purchase_order_items WHERE purchase_order_id = $1`, [purchaseOrderId]);
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
    table: 'purchase_orders',
    companyId,
    pagination,
    searchableColumns: ['po_number'],
    extraConditions,
    extraParams,
  });
  const [data, count] = await Promise.all([query(dataSql, dataParams), query(countSql, countParams)]);
  return { rows: data.rows, totalRecords: parseInt(count.rows[0].count, 10) };
}

async function updateStatus(client, id, expectedVersion, status, updatedBy) {
  const { rows } = await client.query(
    `UPDATE purchase_orders
     SET status = $3, version = version + 1, updated_by = $4, updated_at = now()
     WHERE id = $1 AND version = $2
     RETURNING *`,
    [id, expectedVersion, status, updatedBy],
  );
  return rows[0] || null;
}

module.exports = { create, createItems, findById, findByIdForUpdate, findItems, list, updateStatus, generatePoNumber };
