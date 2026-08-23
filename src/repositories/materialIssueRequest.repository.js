const crypto = require('crypto');
const { query } = require('../config/db');

function generateMirNumber() {
  return `MIR-${Date.now()}-${crypto.randomBytes(2).toString('hex').toUpperCase()}`;
}

const SELECT_WITH_JOINS = `
  SELECT mir.*, wo.work_order_number, wo.product_id, wo.product_variant_id, p.name AS product_name,
         w.name AS warehouse_name, ru.full_name AS requested_by_name, ru.department AS requested_by_department,
         au.full_name AS approved_by_name
  FROM material_issue_requests mir
  JOIN work_orders wo ON wo.id = mir.work_order_id
  JOIN products p ON p.id = wo.product_id
  JOIN warehouses w ON w.id = mir.warehouse_id
  LEFT JOIN users ru ON ru.id = mir.requested_by
  LEFT JOIN users au ON au.id = mir.approved_by
`;

async function create(client, companyId, { workOrderId, warehouseId, requestedBy, remarks }, createdBy) {
  const { rows } = await client.query(
    `INSERT INTO material_issue_requests (company_id, work_order_id, warehouse_id, mir_number, requested_by, remarks, created_by, updated_by)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $7)
     RETURNING *`,
    [companyId, workOrderId, warehouseId, generateMirNumber(), requestedBy, remarks || null, createdBy],
  );
  return rows[0];
}

async function createItems(client, materialIssueRequestId, items) {
  for (const item of items) {
    await client.query(
      `INSERT INTO material_issue_request_items (material_issue_request_id, raw_material_variant_id, quantity_required)
       VALUES ($1, $2, $3)`,
      [materialIssueRequestId, item.rawMaterialVariantId, item.quantityRequired],
    );
  }
}

async function findItems(materialIssueRequestId, runner = query) {
  const { rows } = await runner(
    `SELECT mri.*, pv.sku, pv.size, pv.color, p.name AS raw_material_name, p.uom
     FROM material_issue_request_items mri
     JOIN product_variants pv ON pv.id = mri.raw_material_variant_id
     JOIN products p ON p.id = pv.product_id
     WHERE mri.material_issue_request_id = $1`,
    [materialIssueRequestId],
  );
  return rows;
}

async function findById(companyId, id) {
  const { rows } = await query(`${SELECT_WITH_JOINS} WHERE mir.id = $1 AND mir.company_id = $2 AND mir.is_deleted = FALSE`, [
    id,
    companyId,
  ]);
  return rows[0] || null;
}

async function findByIdForUpdate(client, companyId, id) {
  const { rows } = await client.query(
    `SELECT * FROM material_issue_requests WHERE id = $1 AND company_id = $2 AND is_deleted = FALSE FOR UPDATE`,
    [id, companyId],
  );
  return rows[0] || null;
}

async function list(companyId, pagination, { status } = {}) {
  const { limit, offset } = pagination;
  const conditions = ['mir.company_id = $1', 'mir.is_deleted = FALSE'];
  const params = [companyId];
  if (status) {
    params.push(status);
    conditions.push(`mir.status = $${params.length}`);
  }
  const whereClause = `WHERE ${conditions.join(' AND ')}`;
  const dataSql = `${SELECT_WITH_JOINS} ${whereClause} ORDER BY mir.created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
  const countSql = `SELECT COUNT(*) FROM material_issue_requests mir ${whereClause}`;

  const [data, count] = await Promise.all([query(dataSql, [...params, limit, offset]), query(countSql, params)]);
  return { rows: data.rows, totalRecords: parseInt(count.rows[0].count, 10) };
}

async function updateStatus(client, id, expectedVersion, { status, approvedBy }, updatedBy) {
  const { rows } = await client.query(
    `UPDATE material_issue_requests
     SET status = $3::varchar, approved_by = COALESCE($4, approved_by),
         approved_at = CASE WHEN $3::varchar = 'approved' THEN now() ELSE approved_at END,
         issued_at = CASE WHEN $3::varchar = 'issued' THEN now() ELSE issued_at END,
         version = version + 1, updated_by = $5, updated_at = now()
     WHERE id = $1 AND version = $2
     RETURNING *`,
    [id, expectedVersion, status, approvedBy || null, updatedBy],
  );
  return rows[0] || null;
}

/** Records how much was actually reserved for this line at approval time — what "Mark Issued" later deducts from on-hand. */
async function setItemReserved(client, itemId, quantityReserved) {
  await client.query(`UPDATE material_issue_request_items SET quantity_reserved = $2 WHERE id = $1`, [itemId, quantityReserved]);
}

/** Records how much was actually issued (deducted from on-hand) for this line — today always equal to quantity_reserved, tracked independently for future partial-issue support. */
async function setItemIssued(client, itemId, quantityIssued) {
  await client.query(`UPDATE material_issue_request_items SET quantity_issued = $2 WHERE id = $1`, [itemId, quantityIssued]);
}

module.exports = { create, createItems, findItems, findById, findByIdForUpdate, list, updateStatus, setItemReserved, setItemIssued };
