const { query } = require('../config/db');

async function lockOrCreateForUpdate(client, companyId, warehouseId, itemVariantId) {
  await client.query(
    `INSERT INTO item_stock (company_id, warehouse_id, item_variant_id)
     VALUES ($1, $2, $3)
     ON CONFLICT (warehouse_id, item_variant_id) WHERE is_deleted = FALSE DO NOTHING`,
    [companyId, warehouseId, itemVariantId],
  );

  const { rows } = await client.query(
    `SELECT * FROM item_stock WHERE warehouse_id = $1 AND item_variant_id = $2 AND is_deleted = FALSE FOR UPDATE`,
    [warehouseId, itemVariantId],
  );
  return rows[0];
}

async function setQuantities(client, id, { quantityOnHand, quantityReserved }) {
  const { rows } = await client.query(
    `UPDATE item_stock
     SET quantity_on_hand = $2, quantity_reserved = $3, version = version + 1, updated_at = now()
     WHERE id = $1
     RETURNING *`,
    [id, quantityOnHand, quantityReserved],
  );
  return rows[0];
}

async function recordMovement(
  client,
  companyId,
  { warehouseId, itemVariantId, movementType, quantityChange, quantityOnHandAfter, referenceType, referenceId, financeTransactionId, remarks },
  createdBy,
) {
  const { rows } = await client.query(
    `INSERT INTO item_stock_movements (company_id, warehouse_id, item_variant_id, movement_type, quantity_change,
                                        quantity_on_hand_after, reference_type, reference_id, finance_transaction_id, remarks, created_by)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
     RETURNING *`,
    [
      companyId,
      warehouseId,
      itemVariantId,
      movementType,
      quantityChange,
      quantityOnHandAfter,
      referenceType || null,
      referenceId || null,
      financeTransactionId || null,
      remarks || null,
      createdBy,
    ],
  );
  return rows[0];
}

async function listStock(companyId, pagination, { warehouseId, itemVariantId } = {}) {
  const conditions = ['s.company_id = $1', 's.is_deleted = FALSE'];
  const params = [companyId];
  if (warehouseId) {
    params.push(warehouseId);
    conditions.push(`s.warehouse_id = $${params.length}`);
  }
  if (itemVariantId) {
    params.push(itemVariantId);
    conditions.push(`s.item_variant_id = $${params.length}`);
  }
  if (pagination.search) {
    params.push(`%${pagination.search}%`);
    conditions.push(`(i.item_name ILIKE $${params.length} OR iv.sku ILIKE $${params.length})`);
  }

  const whereClause = `WHERE ${conditions.join(' AND ')}`;
  const dataSql = `
    SELECT s.*, iv.sku, iv.size, iv.color, i.item_name, i.item_code, i.uom, w.name AS warehouse_name
    FROM item_stock s
    JOIN item_variants iv ON iv.id = s.item_variant_id
    JOIN items i ON i.id = iv.item_id
    JOIN warehouses w ON w.id = s.warehouse_id
    ${whereClause}
    ORDER BY s.updated_at DESC
    LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
  const countSql = `
    SELECT COUNT(*) FROM item_stock s
    JOIN item_variants iv ON iv.id = s.item_variant_id
    JOIN items i ON i.id = iv.item_id
    ${whereClause}`;

  const [data, count] = await Promise.all([
    query(dataSql, [...params, pagination.limit, pagination.offset]),
    query(countSql, params),
  ]);
  return { rows: data.rows, totalRecords: parseInt(count.rows[0].count, 10) };
}

async function listMovements(companyId, pagination, { itemVariantId } = {}) {
  const conditions = ['m.company_id = $1', 'm.is_deleted = FALSE'];
  const params = [companyId];
  if (itemVariantId) {
    params.push(itemVariantId);
    conditions.push(`m.item_variant_id = $${params.length}`);
  }
  const whereClause = `WHERE ${conditions.join(' AND ')}`;
  const dataSql = `
    SELECT m.*, iv.sku, iv.size, iv.color, i.item_name, i.item_code, w.name AS warehouse_name
    FROM item_stock_movements m
    JOIN item_variants iv ON iv.id = m.item_variant_id
    JOIN items i ON i.id = iv.item_id
    JOIN warehouses w ON w.id = m.warehouse_id
    ${whereClause}
    ORDER BY m.created_at DESC
    LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
  const countSql = `
    SELECT COUNT(*) FROM item_stock_movements m
    JOIN item_variants iv ON iv.id = m.item_variant_id
    ${whereClause}`;

  const [data, count] = await Promise.all([
    query(dataSql, [...params, pagination.limit, pagination.offset]),
    query(countSql, params),
  ]);
  return { rows: data.rows, totalRecords: parseInt(count.rows[0].count, 10) };
}

module.exports = { lockOrCreateForUpdate, setQuantities, recordMovement, listStock, listMovements };
