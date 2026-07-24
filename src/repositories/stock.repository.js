const { query } = require('../config/db');
const { buildListQuery } = require('../utils/queryBuilder');

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

async function listByWarehouse(companyId, pagination, warehouseId) {
  const extraConditions = ['warehouse_id = $2'];
  const { dataSql, dataParams, countSql, countParams } = buildListQuery({
    table: 'warehouse_stock',
    companyId,
    pagination,
    extraConditions,
    extraParams: [warehouseId],
  });
  const [data, count] = await Promise.all([query(dataSql, dataParams), query(countSql, countParams)]);
  return { rows: data.rows, totalRecords: parseInt(count.rows[0].count, 10) };
}

module.exports = { lockOrCreateForUpdate, setQuantities, getStock, listByWarehouse };
