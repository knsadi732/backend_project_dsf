const { query } = require('../config/db');

/** Resolves branch/warehouse/vendor/PR ids to display names alongside them —
 * raw query rather than buildListQuery since the joins make bare column names ambiguous. */
const SELECT_WITH_NAMES = `
  SELECT po.*, b.name AS branch_name, w.name AS warehouse_name, v.name AS vendor_name, pr.pr_number
  FROM purchase_orders po
  LEFT JOIN branches b ON b.id = po.branch_id
  LEFT JOIN warehouses w ON w.id = po.warehouse_id
  LEFT JOIN vendors v ON v.id = po.vendor_id
  LEFT JOIN purchase_requests pr ON pr.id = po.purchase_request_id`;

/** Reserves and returns the next PO number, e.g. 'DSF-PO-0001'. Each call consumes the sequence. */
async function generatePoNumber(runner = query) {
  const { rows } = await runner(
    `SELECT 'DSF-PO-' || LPAD(nextval('purchase_orders_po_seq')::text, 4, '0') AS po_number`,
  );
  return rows[0].po_number;
}

/** Previews the next PO number without consuming the sequence — safe to call repeatedly. */
async function peekPoNumber(runner = query) {
  const { rows } = await runner(
    `SELECT 'DSF-PO-' || LPAD((CASE WHEN is_called THEN last_value + 1 ELSE last_value END)::text, 4, '0') AS po_number
     FROM purchase_orders_po_seq`,
  );
  return rows[0].po_number;
}

async function create(
  client,
  companyId,
  {
    branchId,
    warehouseId,
    vendorId,
    purchaseRequestId,
    rfqId,
    totalAmount,
    taxAmount,
    deliveryAddress,
    paymentTerms,
    expectedDeliveryDate,
  },
  createdBy,
) {
  const number = await generatePoNumber((text, params) => client.query(text, params));
  const { rows } = await client.query(
    `INSERT INTO purchase_orders (
       company_id, branch_id, warehouse_id, vendor_id, purchase_request_id, rfq_id, po_number,
       total_amount, tax_amount, delivery_address, payment_terms, expected_delivery_date, created_by, updated_by
     )
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $13)
     RETURNING *`,
    [
      companyId,
      branchId,
      warehouseId,
      vendorId,
      purchaseRequestId,
      rfqId || null,
      number,
      totalAmount,
      taxAmount,
      deliveryAddress || null,
      paymentTerms || null,
      expectedDeliveryDate || null,
      createdBy,
    ],
  );
  return rows[0];
}

async function createItems(client, purchaseOrderId, items) {
  for (const item of items) {
    await client.query(
      `INSERT INTO purchase_order_items (purchase_order_id, product_variant_id, item_variant_id, quantity, unit_cost, line_total)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [purchaseOrderId, item.productVariantId || null, item.itemVariantId || null, item.quantity, item.unitCost, item.lineTotal],
    );
  }
}

async function findById(companyId, id) {
  const { rows } = await query(
    `${SELECT_WITH_NAMES} WHERE po.id = $1 AND po.company_id = $2 AND po.is_deleted = FALSE`,
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
  const { rows } = await query(
    `SELECT poi.*, pv.sku, pv.size, pv.color, p.name AS product_name, p.hsn_code, p.uom,
            iv.sku AS item_sku, iv.size AS item_size, iv.color AS item_color,
            it.item_code, it.item_name, it.uom AS item_uom
     FROM purchase_order_items poi
     LEFT JOIN product_variants pv ON pv.id = poi.product_variant_id
     LEFT JOIN products p ON p.id = pv.product_id
     LEFT JOIN item_variants iv ON iv.id = poi.item_variant_id
     LEFT JOIN items it ON it.id = iv.item_id
     WHERE poi.purchase_order_id = $1`,
    [purchaseOrderId],
  );
  return rows;
}

async function list(companyId, pagination, { status } = {}) {
  const conditions = ['po.company_id = $1', 'po.is_deleted = FALSE'];
  const params = [companyId];

  if (status) {
    params.push(status);
    conditions.push(`po.status = $${params.length}`);
  }
  if (pagination.search) {
    params.push(`%${pagination.search}%`);
    conditions.push(`po.po_number ILIKE $${params.length}`);
  }

  const whereClause = `WHERE ${conditions.join(' AND ')}`;
  const safeSortBy = /^[a-zA-Z_]+$/.test(pagination.sortBy) ? pagination.sortBy : 'created_at';
  const safeSortOrder = pagination.sortOrder === 'asc' ? 'ASC' : 'DESC';

  const dataSql = `${SELECT_WITH_NAMES} ${whereClause} ORDER BY po.${safeSortBy} ${safeSortOrder} LIMIT $${
    params.length + 1
  } OFFSET $${params.length + 2}`;
  const dataParams = [...params, pagination.limit, pagination.offset];
  const countSql = `SELECT COUNT(*) FROM purchase_orders po ${whereClause}`;

  const [data, count] = await Promise.all([query(dataSql, dataParams), query(countSql, params)]);
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

module.exports = { create, createItems, findById, findByIdForUpdate, findItems, list, updateStatus, generatePoNumber, peekPoNumber };
