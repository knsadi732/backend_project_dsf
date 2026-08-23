const { query } = require('../config/db');

/**
 * Always called inline from stock.service.js's mutators using their
 * already-open transaction client — never a standalone write, so this
 * table's rows always land atomically with the `warehouse_stock` change
 * they describe.
 */
async function record(
  client,
  companyId,
  {
    warehouseId,
    productVariantId,
    movementType,
    quantityChange = 0,
    quantityReservedChange = 0,
    quantityOnHandAfter,
    quantityReservedAfter,
    referenceType,
    referenceId,
    remarks,
  },
  createdBy,
) {
  await client.query(
    `INSERT INTO inventory_movements (company_id, warehouse_id, product_variant_id, movement_type, quantity_change,
                                       quantity_reserved_change, quantity_on_hand_after, quantity_reserved_after,
                                       reference_type, reference_id, remarks, created_by)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
    [
      companyId,
      warehouseId,
      productVariantId,
      movementType,
      quantityChange,
      quantityReservedChange,
      quantityOnHandAfter ?? null,
      quantityReservedAfter ?? null,
      referenceType || null,
      referenceId || null,
      remarks || null,
      createdBy || null,
    ],
  );
}

// Immutable append-only log (no is_deleted column, same convention as
// audit_logs) — raw SQL rather than buildListQuery, which assumes every
// table is soft-deletable.
async function list(companyId, pagination, { warehouseId, productVariantId, movementType } = {}) {
  // Prefixed with im. throughout — company_id/warehouse_id both also exist
  // on the joined product_variants/products/warehouses tables below, so an
  // unqualified reference would be ambiguous.
  const conditions = ['im.company_id = $1'];
  const params = [companyId];

  if (warehouseId) {
    params.push(warehouseId);
    conditions.push(`im.warehouse_id = $${params.length}`);
  }
  if (productVariantId) {
    params.push(productVariantId);
    conditions.push(`im.product_variant_id = $${params.length}`);
  }
  if (movementType) {
    params.push(movementType);
    conditions.push(`im.movement_type = $${params.length}`);
  }

  const whereClause = `WHERE ${conditions.join(' AND ')}`;
  const countSql = `SELECT COUNT(*) FROM inventory_movements im ${whereClause}`;
  params.push(pagination.limit, pagination.offset);
  const dataSql = `
    SELECT im.*, pv.sku, pv.size, pv.color, p.name AS product_name, w.name AS warehouse_name
    FROM inventory_movements im
    LEFT JOIN product_variants pv ON pv.id = im.product_variant_id
    LEFT JOIN products p ON p.id = pv.product_id
    LEFT JOIN warehouses w ON w.id = im.warehouse_id
    ${whereClause}
    ORDER BY im.created_at DESC
    LIMIT $${params.length - 1} OFFSET $${params.length}`;

  const [data, count] = await Promise.all([query(dataSql, params), query(countSql, params.slice(0, -2))]);
  return { rows: data.rows, totalRecords: parseInt(count.rows[0].count, 10) };
}

module.exports = { record, list };
