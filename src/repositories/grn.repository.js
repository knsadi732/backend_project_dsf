const { query } = require('../config/db');

/** Resolves branch/warehouse/vendor/PO ids to display names alongside them —
 * raw query rather than buildListQuery since the joins make bare column names ambiguous. */
const SELECT_WITH_NAMES = `
  SELECT g.*, b.name AS branch_name, w.name AS warehouse_name, v.name AS vendor_name, po.po_number,
         d.file_name AS vendor_invoice_file_name, d.mime_type AS vendor_invoice_mime_type
  FROM grns g
  LEFT JOIN branches b ON b.id = g.branch_id
  LEFT JOIN warehouses w ON w.id = g.warehouse_id
  LEFT JOIN vendors v ON v.id = g.vendor_id
  LEFT JOIN purchase_orders po ON po.id = g.purchase_order_id
  LEFT JOIN documents d ON d.id = g.vendor_invoice_document_id`;

/** Reserves and returns the next GRN number, e.g. 'DSF-GRN-0001'. Each call consumes the sequence. */
async function generateGrnNumber(runner = query) {
  const { rows } = await runner(
    `SELECT 'DSF-GRN-' || LPAD(nextval('grns_grn_seq')::text, 4, '0') AS grn_number`,
  );
  return rows[0].grn_number;
}

async function create(
  client,
  companyId,
  { branchId, warehouseId, vendorId, purchaseOrderId, remarks },
  createdBy,
) {
  const grnNumber = await generateGrnNumber((text, params) => client.query(text, params));
  const { rows } = await client.query(
    `INSERT INTO grns (
       company_id, branch_id, warehouse_id, vendor_id, purchase_order_id, grn_number, remarks, created_by, updated_by
     )
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $8)
     RETURNING *`,
    [companyId, branchId, warehouseId, vendorId, purchaseOrderId, grnNumber, remarks || null, createdBy],
  );
  return rows[0];
}

async function createItems(client, grnId, items) {
  for (const item of items) {
    await client.query(
      `INSERT INTO grn_items (grn_id, purchase_order_item_id, product_variant_id, item_variant_id, ordered_quantity, received_quantity, unit_cost)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [grnId, item.purchaseOrderItemId, item.productVariantId || null, item.itemVariantId || null, item.orderedQuantity, item.receivedQuantity, item.unitCost],
    );
  }
}

async function findById(companyId, id) {
  const { rows } = await query(
    `${SELECT_WITH_NAMES} WHERE g.id = $1 AND g.company_id = $2 AND g.is_deleted = FALSE`,
    [id, companyId],
  );
  return rows[0] || null;
}

async function findByGrnNumber(companyId, grnNumber) {
  const { rows } = await query(
    `${SELECT_WITH_NAMES} WHERE g.grn_number = $1 AND g.company_id = $2 AND g.is_deleted = FALSE`,
    [grnNumber, companyId],
  );
  return rows[0] || null;
}

async function findByPurchaseOrderId(companyId, purchaseOrderId) {
  const { rows } = await query(
    `${SELECT_WITH_NAMES} WHERE g.purchase_order_id = $1 AND g.company_id = $2 AND g.is_deleted = FALSE`,
    [purchaseOrderId, companyId],
  );
  return rows[0] || null;
}

async function updateVendorInvoice(client, companyId, grnId, documentId) {
  const { rows } = await client.query(
    `UPDATE grns
     SET vendor_invoice_document_id = $3, vendor_invoice_uploaded_at = now(), updated_at = now()
     WHERE id = $1 AND company_id = $2 AND is_deleted = FALSE
     RETURNING *`,
    [grnId, companyId, documentId],
  );
  return rows[0] || null;
}

async function findItems(grnId) {
  const { rows } = await query(
    `SELECT gi.*, pv.sku, pv.size, pv.color, p.name AS product_name,
            iv.sku AS item_sku, iv.size AS item_size, iv.color AS item_color,
            it.item_code, it.item_name, it.uom AS item_uom
     FROM grn_items gi
     LEFT JOIN product_variants pv ON pv.id = gi.product_variant_id
     LEFT JOIN products p ON p.id = pv.product_id
     LEFT JOIN item_variants iv ON iv.id = gi.item_variant_id
     LEFT JOIN items it ON it.id = iv.item_id
     WHERE gi.grn_id = $1`,
    [grnId],
  );
  return rows;
}

async function list(companyId, pagination, { vendorId, warehouseId } = {}) {
  const conditions = ['g.company_id = $1', 'g.is_deleted = FALSE'];
  const params = [companyId];

  if (vendorId) {
    params.push(vendorId);
    conditions.push(`g.vendor_id = $${params.length}`);
  }
  if (warehouseId) {
    params.push(warehouseId);
    conditions.push(`g.warehouse_id = $${params.length}`);
  }
  if (pagination.search) {
    params.push(`%${pagination.search}%`);
    conditions.push(`g.grn_number ILIKE $${params.length}`);
  }

  const whereClause = `WHERE ${conditions.join(' AND ')}`;
  const safeSortBy = /^[a-zA-Z_]+$/.test(pagination.sortBy) ? pagination.sortBy : 'created_at';
  const safeSortOrder = pagination.sortOrder === 'asc' ? 'ASC' : 'DESC';

  const dataSql = `${SELECT_WITH_NAMES} ${whereClause} ORDER BY g.${safeSortBy} ${safeSortOrder} LIMIT $${
    params.length + 1
  } OFFSET $${params.length + 2}`;
  const dataParams = [...params, pagination.limit, pagination.offset];
  const countSql = `SELECT COUNT(*) FROM grns g ${whereClause}`;

  const [data, count] = await Promise.all([query(dataSql, dataParams), query(countSql, params)]);
  return { rows: data.rows, totalRecords: parseInt(count.rows[0].count, 10) };
}

module.exports = {
  create,
  createItems,
  findById,
  findByGrnNumber,
  findByPurchaseOrderId,
  findItems,
  list,
  updateVendorInvoice,
  generateGrnNumber,
};
