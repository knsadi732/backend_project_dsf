const { query } = require('../config/db');

/**
 * Locks (or creates then locks) the stock row for a warehouse+product pair.
 * Must be called with a client already inside a transaction — callers use
 * this ahead of any quantity mutation to enforce the Anti-Overselling
 * Policy's pessimistic locking rule (plan.md Chapter 4).
 */
async function lockOrCreateForUpdate(client, companyId, warehouseId, productVariantId) {
  await client.query(
    `INSERT INTO warehouse_stock (company_id, warehouse_id, product_variant_id)
     VALUES ($1, $2, $3)
     ON CONFLICT (warehouse_id, product_variant_id) WHERE is_deleted = FALSE DO NOTHING`,
    [companyId, warehouseId, productVariantId],
  );

  const { rows } = await client.query(
    `SELECT * FROM warehouse_stock
     WHERE warehouse_id = $1 AND product_variant_id = $2 AND is_deleted = FALSE
     FOR UPDATE`,
    [warehouseId, productVariantId],
  );
  return rows[0];
}

async function setQuantities(client, id, { quantityOnHand, quantityReserved }) {
  const { rows } = await client.query(
    `UPDATE warehouse_stock
     SET quantity_on_hand = $2, quantity_reserved = $3, version = version + 1, updated_at = now()
     WHERE id = $1
     RETURNING *`,
    [id, quantityOnHand, quantityReserved],
  );
  return rows[0];
}

async function getStock(companyId, warehouseId, productVariantId) {
  const { rows } = await query(
    `SELECT * FROM warehouse_stock
     WHERE company_id = $1 AND warehouse_id = $2 AND product_variant_id = $3 AND is_deleted = FALSE`,
    [companyId, warehouseId, productVariantId],
  );
  return rows[0] || null;
}

// Inventory Category (not to be confused with product_categories, the
// merchandising category like "Sneakers"): every product is either sellable
// (finished stock actually sold to customers) or not — and non-sellable
// splits further into office_consumable (product_type = 'consumable') vs
// raw_material (everything else non-sellable: raw_material, packaging_material,
// semi_finished_goods, ...). Mirrors is_sellable's own auto-derivation in
// migration 0071. Kept as one CASE expression so the list/summary queries
// below can filter/group on it identically.
const INVENTORY_CATEGORY_CASE = `
  CASE
    WHEN p.is_sellable THEN 'salable'
    WHEN p.product_type = 'consumable' THEN 'office_consumable'
    ELSE 'raw_material'
  END
`;

// Joined so the client gets variant/product/category/warehouse *names*
// directly instead of having to resolve IDs against three other list
// endpoints itself.
async function listByWarehouse(companyId, pagination, warehouseId, inventoryCategory) {
  const { limit, offset } = pagination;
  const params = [companyId];
  let warehouseClause = '';
  if (warehouseId) {
    params.push(warehouseId);
    warehouseClause = `AND ws.warehouse_id = $${params.length}`;
  }
  let categoryClause = '';
  if (inventoryCategory) {
    params.push(inventoryCategory);
    categoryClause = `AND (${INVENTORY_CATEGORY_CASE}) = $${params.length}`;
  }

  const dataSql = `
    SELECT
      ws.id, ws.warehouse_id, ws.product_variant_id, ws.quantity_on_hand, ws.quantity_reserved,
      ws.status, ws.remarks, ws.created_at, ws.updated_at,
      pv.sku AS variant_sku, pv.size AS variant_size, pv.color AS variant_color,
      p.name AS product_name, p.product_type, p.is_sellable, pc.name AS category_name, w.name AS warehouse_name,
      (${INVENTORY_CATEGORY_CASE}) AS inventory_category
    FROM warehouse_stock ws
    JOIN product_variants pv ON pv.id = ws.product_variant_id
    JOIN products p ON p.id = pv.product_id
    LEFT JOIN product_categories pc ON pc.id = p.category_id
    JOIN warehouses w ON w.id = ws.warehouse_id
    WHERE ws.company_id = $1 AND ws.is_deleted = FALSE ${warehouseClause} ${categoryClause}
    ORDER BY ws.created_at DESC
    LIMIT $${params.length + 1} OFFSET $${params.length + 2}
  `;
  const countSql = `
    SELECT COUNT(*) FROM warehouse_stock ws
    JOIN product_variants pv ON pv.id = ws.product_variant_id
    JOIN products p ON p.id = pv.product_id
    WHERE ws.company_id = $1 AND ws.is_deleted = FALSE ${warehouseClause} ${categoryClause}
  `;

  const [data, count] = await Promise.all([
    query(dataSql, [...params, limit, offset]),
    query(countSql, params),
  ]);
  return { rows: data.rows, totalRecords: parseInt(count.rows[0].count, 10) };
}

/** Totals per Salable / Office Consumable / Raw Material bucket — powers the Inventory page's summary tiles. */
async function summarizeByCategory(companyId, warehouseId) {
  const params = [companyId];
  let warehouseClause = '';
  if (warehouseId) {
    params.push(warehouseId);
    warehouseClause = `AND ws.warehouse_id = $${params.length}`;
  }

  const { rows } = await query(
    `SELECT
       (${INVENTORY_CATEGORY_CASE}) AS inventory_category,
       COUNT(*) AS sku_count,
       COALESCE(SUM(ws.quantity_on_hand), 0) AS total_on_hand,
       COALESCE(SUM(ws.quantity_reserved), 0) AS total_reserved
     FROM warehouse_stock ws
     JOIN product_variants pv ON pv.id = ws.product_variant_id
     JOIN products p ON p.id = pv.product_id
     WHERE ws.company_id = $1 AND ws.is_deleted = FALSE ${warehouseClause}
     GROUP BY inventory_category`,
    params,
  );
  return rows;
}

module.exports = { lockOrCreateForUpdate, setQuantities, getStock, listByWarehouse, summarizeByCategory };
