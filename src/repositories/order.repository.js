const crypto = require('crypto');
const { query } = require('../config/db');
const { buildListQuery } = require('../utils/queryBuilder');

function generateOrderNumber() {
  return `ORD-${Date.now()}-${crypto.randomBytes(2).toString('hex').toUpperCase()}`;
}

async function create(client, companyId, { branchId, warehouseId, customerId, subtotal, taxAmount, totalAmount, promisedDeliveryDate }, createdBy) {
  const { rows } = await client.query(
    `INSERT INTO orders (company_id, branch_id, warehouse_id, customer_id, order_number, subtotal, tax_amount, total_amount, promised_delivery_date, created_by, updated_by)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $10)
     RETURNING *`,
    [companyId, branchId, warehouseId, customerId, generateOrderNumber(), subtotal, taxAmount, totalAmount, promisedDeliveryDate || null, createdBy],
  );
  return rows[0];
}

async function createItems(client, orderId, items) {
  for (const item of items) {
    await client.query(
      `INSERT INTO order_items (order_id, product_variant_id, quantity, unit_price, tax_rate, line_total)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [orderId, item.productVariantId, item.quantity, item.unitPrice, item.taxRate, item.lineTotal],
    );
  }
}

async function findById(companyId, id) {
  const { rows } = await query(`SELECT * FROM orders WHERE id = $1 AND company_id = $2 AND is_deleted = FALSE`, [
    id,
    companyId,
  ]);
  return rows[0] || null;
}

/** Locks the order row for the duration of a status-transition transaction (optimistic + row lock combined). */
async function findByIdForUpdate(client, companyId, id) {
  const { rows } = await client.query(
    `SELECT * FROM orders WHERE id = $1 AND company_id = $2 AND is_deleted = FALSE FOR UPDATE`,
    [id, companyId],
  );
  return rows[0] || null;
}

async function findItems(orderId) {
  const { rows } = await query(
    `SELECT oi.*, pv.sku, pv.size, pv.color, p.id AS product_id, p.name AS product_name, pc.name AS category_name
     FROM order_items oi
     JOIN product_variants pv ON pv.id = oi.product_variant_id
     JOIN products p ON p.id = pv.product_id
     LEFT JOIN product_categories pc ON pc.id = p.category_id
     WHERE oi.order_id = $1`,
    [orderId],
  );
  return rows;
}

/** Batch-loads a `sku — product name` summary per order so list rows don't require an N+1 detail fetch to know what's being sold. */
async function attachItemSummaries(orders) {
  if (!orders.length) return orders;
  const { rows: items } = await query(
    `SELECT oi.order_id, oi.quantity, pv.sku, p.name AS product_name, pc.name AS category_name
     FROM order_items oi
     JOIN product_variants pv ON pv.id = oi.product_variant_id
     JOIN products p ON p.id = pv.product_id
     LEFT JOIN product_categories pc ON pc.id = p.category_id
     WHERE oi.order_id = ANY($1)`,
    [orders.map((order) => order.id)],
  );
  const itemsByOrderId = {};
  for (const item of items) {
    (itemsByOrderId[item.order_id] ??= []).push({
      sku: item.sku,
      productName: item.product_name,
      categoryName: item.category_name,
      quantity: item.quantity,
    });
  }
  return orders.map((order) => ({ ...order, items: itemsByOrderId[order.id] ?? [] }));
}

async function list(companyId, pagination, { status } = {}) {
  const extraConditions = [];
  const extraParams = [];
  if (status) {
    extraConditions.push(`status = $${extraParams.length + 2}`);
    extraParams.push(status);
  }

  const { dataSql, dataParams, countSql, countParams } = buildListQuery({
    table: 'orders',
    companyId,
    pagination,
    searchableColumns: ['order_number'],
    extraConditions,
    extraParams,
  });
  const [data, count] = await Promise.all([query(dataSql, dataParams), query(countSql, countParams)]);
  const rows = await attachItemSummaries(data.rows);
  return { rows, totalRecords: parseInt(count.rows[0].count, 10) };
}

/**
 * Optimistic version check guards against a concurrent transition racing
 * this one. Stamps `dispatched_at` the moment status first reaches
 * "dispatched" — that's the line between a Proforma Invoice (order not yet
 * shipped, pricing is an estimate) and a Tax Invoice (goods shipped, the
 * charge is final) on the sales-order PDF.
 */
async function updateStatus(client, id, expectedVersion, { status, paymentStatus }, updatedBy) {
  const { rows } = await client.query(
    `UPDATE orders
     SET status = COALESCE($3, status), payment_status = COALESCE($4, payment_status),
         dispatched_at = CASE WHEN $3 = 'dispatched' THEN now() ELSE dispatched_at END,
         version = version + 1, updated_by = $5, updated_at = now()
     WHERE id = $1 AND version = $2
     RETURNING *`,
    [id, expectedVersion, status, paymentStatus, updatedBy],
  );
  return rows[0] || null;
}

module.exports = { create, createItems, findById, findByIdForUpdate, findItems, list, updateStatus };
