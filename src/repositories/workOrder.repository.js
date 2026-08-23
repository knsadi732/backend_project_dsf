const crypto = require('crypto');
const { query } = require('../config/db');

function generateWorkOrderNumber() {
  return `WO-${Date.now()}-${crypto.randomBytes(2).toString('hex').toUpperCase()}`;
}

const SELECT_WITH_JOINS = `
  SELECT wo.*, p.name AS product_name, pv.sku, pv.size, pv.color, o.order_number AS sales_order_number, w.name AS warehouse_name
  FROM work_orders wo
  JOIN products p ON p.id = wo.product_id
  LEFT JOIN product_variants pv ON pv.id = wo.product_variant_id
  LEFT JOIN orders o ON o.id = wo.sales_order_id
  LEFT JOIN warehouses w ON w.id = wo.warehouse_id
`;

async function create(
  client,
  companyId,
  {
    productId,
    productVariantId,
    salesOrderId,
    warehouseId,
    workOrderNumber,
    quantity,
    stage,
    dueDate,
    rawMaterialCost,
    labourCost,
    machineCost,
    electricityCost,
    packagingCost,
    overheadCost,
    remarks,
  },
  createdBy,
) {
  const { rows } = await client.query(
    `INSERT INTO work_orders (
       company_id, product_id, product_variant_id, sales_order_id, warehouse_id, work_order_number, quantity, stage, due_date,
       raw_material_cost, labour_cost, machine_cost, electricity_cost, packaging_cost, overhead_cost,
       remarks, created_by, updated_by
     )
     VALUES ($1, $2, $3, $4, $5, $6, $7, COALESCE($8, 'pending'), $9, COALESCE($10, 0), COALESCE($11, 0), COALESCE($12, 0),
             COALESCE($13, 0), COALESCE($14, 0), COALESCE($15, 0), $16, $17, $17)
     RETURNING *`,
    [
      companyId,
      productId,
      productVariantId || null,
      salesOrderId || null,
      warehouseId || null,
      workOrderNumber || generateWorkOrderNumber(),
      quantity,
      stage,
      dueDate || null,
      rawMaterialCost,
      labourCost,
      machineCost,
      electricityCost,
      packagingCost,
      overheadCost,
      remarks || null,
      createdBy,
    ],
  );
  return rows[0];
}

async function findById(companyId, id) {
  const { rows } = await query(`${SELECT_WITH_JOINS} WHERE wo.id = $1 AND wo.company_id = $2 AND wo.is_deleted = FALSE`, [
    id,
    companyId,
  ]);
  return rows[0] || null;
}

async function findByIdForUpdate(client, companyId, id) {
  const { rows } = await client.query(
    `SELECT * FROM work_orders WHERE id = $1 AND company_id = $2 AND is_deleted = FALSE FOR UPDATE`,
    [id, companyId],
  );
  return rows[0] || null;
}

async function list(companyId, pagination, { stage, search } = {}) {
  const { limit, offset } = pagination;
  const conditions = ['wo.company_id = $1', 'wo.is_deleted = FALSE'];
  const params = [companyId];

  if (stage) {
    params.push(stage);
    conditions.push(`wo.stage = $${params.length}`);
  }
  if (search) {
    params.push(`%${search}%`);
    conditions.push(`wo.work_order_number ILIKE $${params.length}`);
  }

  const whereClause = `WHERE ${conditions.join(' AND ')}`;
  const dataSql = `${SELECT_WITH_JOINS} ${whereClause} ORDER BY wo.created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
  const countSql = `SELECT COUNT(*) FROM work_orders wo ${whereClause}`;

  const [data, count] = await Promise.all([query(dataSql, [...params, limit, offset]), query(countSql, params)]);
  return { rows: data.rows, totalRecords: parseInt(count.rows[0].count, 10) };
}

async function update(client, companyId, id, fields, updatedBy) {
  const { rows } = await client.query(
    `UPDATE work_orders
     SET quantity = COALESCE($3, quantity), stage = COALESCE($4, stage), due_date = COALESCE($5, due_date),
         raw_material_cost = COALESCE($6, raw_material_cost), labour_cost = COALESCE($7, labour_cost),
         machine_cost = COALESCE($8, machine_cost), electricity_cost = COALESCE($9, electricity_cost),
         packaging_cost = COALESCE($10, packaging_cost), overhead_cost = COALESCE($11, overhead_cost),
         remarks = COALESCE($12, remarks), actual_quantity = COALESCE($13, actual_quantity),
         completed_at = CASE WHEN $4::varchar = 'completed' THEN now() ELSE completed_at END,
         floor_stage = CASE WHEN $4::varchar IN ('completed', 'cancelled') THEN NULL ELSE floor_stage END,
         updated_by = $14, updated_at = now()
     WHERE id = $1 AND company_id = $2 AND is_deleted = FALSE
     RETURNING *`,
    [
      id,
      companyId,
      fields.quantity,
      fields.stage,
      fields.dueDate,
      fields.rawMaterialCost,
      fields.labourCost,
      fields.machineCost,
      fields.electricityCost,
      fields.packagingCost,
      fields.overheadCost,
      fields.remarks,
      fields.actualQuantity,
      updatedBy,
    ],
  );
  return rows[0] || null;
}

/** Floor-stage advance is its own narrow update — never touches `stage`/costs, only where on the shop floor a batch physically is. */
async function setFloorStage(companyId, id, floorStage, updatedBy) {
  const { rows } = await query(
    `UPDATE work_orders
     SET floor_stage = $3, updated_by = $4, updated_at = now()
     WHERE id = $1 AND company_id = $2 AND is_deleted = FALSE AND stage = 'in_progress'
     RETURNING *`,
    [id, companyId, floorStage, updatedBy],
  );
  return rows[0] || null;
}

/** Is there already an unfinished low-stock replenishment WO for this exact variant? Avoids spamming a new one on every dispatch while stock stays under threshold. */
async function findOpenReplenishmentByVariant(client, companyId, productVariantId) {
  const { rows } = await client.query(
    `SELECT * FROM work_orders
     WHERE company_id = $1 AND product_variant_id = $2 AND sales_order_id IS NULL
       AND stage IN ('pending', 'in_progress') AND is_deleted = FALSE
     LIMIT 1`,
    [companyId, productVariantId],
  );
  return rows[0] || null;
}

/** Is there already a shortfall WO for this exact order+variant? Dedupe guard against a retried confirm raising a duplicate. `client` optional — pass it when called inside an open transaction. */
async function findBySalesOrderAndVariant(client, companyId, salesOrderId, productVariantId) {
  const runner = client ?? { query };
  const { rows } = await runner.query(
    `SELECT * FROM work_orders
     WHERE company_id = $1 AND sales_order_id = $2 AND product_variant_id = $3 AND is_deleted = FALSE
     LIMIT 1`,
    [companyId, salesOrderId, productVariantId],
  );
  return rows[0] || null;
}

async function softDelete(companyId, id, deletedBy) {
  const { rows } = await query(
    `UPDATE work_orders SET is_deleted = TRUE, deleted_at = now(), deleted_by = $3
     WHERE id = $1 AND company_id = $2 AND is_deleted = FALSE
     RETURNING id`,
    [id, companyId, deletedBy],
  );
  return rows[0] || null;
}

module.exports = {
  create,
  findById,
  findByIdForUpdate,
  list,
  update,
  setFloorStage,
  softDelete,
  findOpenReplenishmentByVariant,
  findBySalesOrderAndVariant,
};
