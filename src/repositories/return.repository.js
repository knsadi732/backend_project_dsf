const { query } = require('../config/db');
const { buildListQuery } = require('../utils/queryBuilder');

async function peekReturnNumber(runner = query) {
  const { rows } = await runner(
    `SELECT 'DSF-RET-' || LPAD((CASE WHEN is_called THEN last_value + 1 ELSE last_value END)::text, 4, '0') AS return_number
     FROM returns_seq`,
  );
  return rows[0].return_number;
}

async function generateReturnNumber(runner = query) {
  const { rows } = await runner(`SELECT 'DSF-RET-' || LPAD(nextval('returns_seq')::text, 4, '0') AS return_number`);
  return rows[0].return_number;
}

async function create(
  client,
  companyId,
  { branchId, returnNumber, orderId, productVariantId, warehouseId, quantity, type, reason, amount, remarks },
  createdBy,
) {
  const number = returnNumber || (await generateReturnNumber((text, params) => client.query(text, params)));
  const { rows } = await client.query(
    `INSERT INTO returns (
       company_id, branch_id, order_id, product_variant_id, warehouse_id, return_number,
       quantity, type, reason, amount, remarks, created_by, updated_by
     )
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $12)
     RETURNING *`,
    [
      companyId,
      branchId || null,
      orderId,
      productVariantId,
      warehouseId || null,
      number,
      quantity,
      type || 'customer',
      reason,
      amount || 0,
      remarks || null,
      createdBy,
    ],
  );
  return rows[0];
}

const SELECT_WITH_JOINS = `
  SELECT r.*, o.order_number, o.customer_id, c.name AS customer_name,
         pv.sku AS variant_sku, pv.size AS variant_size, pv.color AS variant_color, p.name AS product_name
  FROM returns r
  JOIN orders o ON o.id = r.order_id
  LEFT JOIN customers c ON c.id = o.customer_id
  JOIN product_variants pv ON pv.id = r.product_variant_id
  JOIN products p ON p.id = pv.product_id
`;

async function findById(companyId, id) {
  const { rows } = await query(`${SELECT_WITH_JOINS} WHERE r.id = $1 AND r.company_id = $2 AND r.is_deleted = FALSE`, [id, companyId]);
  return rows[0] || null;
}

async function findByIdForUpdate(client, companyId, id) {
  const { rows } = await client.query(
    `SELECT * FROM returns WHERE id = $1 AND company_id = $2 AND is_deleted = FALSE FOR UPDATE`,
    [id, companyId],
  );
  return rows[0] || null;
}

async function list(companyId, pagination, { status, type } = {}) {
  const extraConditions = [];
  const extraParams = [];
  if (status) {
    extraConditions.push(`r.status = $${extraParams.length + 2}`);
    extraParams.push(status);
  }
  if (type) {
    extraConditions.push(`r.type = $${extraParams.length + 2}`);
    extraParams.push(type);
  }

  const { search, sortBy, sortOrder, limit, offset } = pagination;
  const conditions = ['r.company_id = $1', 'r.is_deleted = FALSE', ...extraConditions];
  const params = [companyId, ...extraParams];

  if (search) {
    params.push(`%${search}%`);
    conditions.push(`(r.return_number ILIKE $${params.length} OR o.order_number ILIKE $${params.length})`);
  }

  const whereClause = `WHERE ${conditions.join(' AND ')}`;
  const safeSortBy = /^[a-zA-Z_]+$/.test(sortBy) ? `r.${sortBy}` : 'r.created_at';
  const safeSortOrder = sortOrder === 'asc' ? 'ASC' : 'DESC';

  const dataSql = `${SELECT_WITH_JOINS} ${whereClause} ORDER BY ${safeSortBy} ${safeSortOrder} LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
  const countSql = `SELECT COUNT(*) FROM returns r JOIN orders o ON o.id = r.order_id ${whereClause}`;

  const [data, count] = await Promise.all([query(dataSql, [...params, limit, offset]), query(countSql, params)]);
  return { rows: data.rows, totalRecords: parseInt(count.rows[0].count, 10) };
}

async function update(client, companyId, id, expectedVersion, payload, updatedBy) {
  const fieldMap = {
    quantity: 'quantity',
    type: 'type',
    reason: 'reason',
    amount: 'amount',
    status: 'status',
    warehouseId: 'warehouse_id',
    courierPartner: 'courier_partner',
    pickupDate: 'pickup_date',
    trackingNumber: 'tracking_number',
    inspectionResult: 'inspection_result',
    inspectionNotes: 'inspection_notes',
    decision: 'decision',
    resolutionType: 'resolution_type',
    refundAmount: 'refund_amount',
    refundMethod: 'refund_method',
    refundReference: 'refund_reference',
    refundDate: 'refund_date',
    refundStatus: 'refund_status',
    replacementOrderId: 'replacement_order_id',
    remarks: 'remarks',
  };

  const sets = [];
  const params = [id, companyId, expectedVersion];
  for (const [key, column] of Object.entries(fieldMap)) {
    if (Object.prototype.hasOwnProperty.call(payload, key)) {
      params.push(payload[key]);
      sets.push(`${column} = $${params.length}`);
    }
  }
  if (sets.length === 0) return findById(companyId, id);

  params.push(updatedBy);
  const { rows } = await client.query(
    `UPDATE returns SET ${sets.join(', ')}, version = version + 1, updated_by = $${params.length}, updated_at = now()
     WHERE id = $1 AND company_id = $2 AND version = $3
     RETURNING *`,
    params,
  );
  return rows[0] || null;
}

async function softDelete(companyId, id, actorId) {
  const { rows } = await query(
    `UPDATE returns SET is_deleted = TRUE, deleted_at = now(), deleted_by = $3, updated_at = now()
     WHERE id = $1 AND company_id = $2 AND is_deleted = FALSE
     RETURNING id`,
    [id, companyId, actorId],
  );
  return rows[0] || null;
}

/** Powers Total returns / Return rate / Refund amount / Replacement orders / Damage % — and, going forward, CR%/RTO% per channel once orders carry a channel. */
async function summarize(companyId, { from, to } = {}) {
  const params = [companyId];
  let dateClause = '';
  if (from && to) {
    params.push(from, to);
    dateClause = `AND created_at >= $2 AND created_at < $3`;
  }
  const { rows } = await query(
    `SELECT
       COUNT(*) AS total_returns,
       COUNT(*) FILTER (WHERE type = 'customer') AS customer_returns,
       COUNT(*) FILTER (WHERE type = 'courier') AS courier_returns,
       COUNT(*) FILTER (WHERE status = 'resolved') AS resolved_returns,
       COUNT(*) FILTER (WHERE decision = 'scrap') AS scrapped_returns,
       COUNT(*) FILTER (WHERE resolution_type = 'replacement') AS replacement_returns,
       COALESCE(SUM(refund_amount) FILTER (WHERE resolution_type = 'refund'), 0) AS refund_amount,
       COALESCE(SUM(amount) FILTER (WHERE decision = 'scrap'), 0) AS scrapped_amount
     FROM returns
     WHERE company_id = $1 AND is_deleted = FALSE ${dateClause}`,
    params,
  );
  return rows[0];
}

/**
 * Same Total/CR/RTO/Damage breakdown as summarize(), but per product/category/
 * variant — a "Sandal" design and a "Sneaker" design don't share one return
 * or damage rate, so Manufacturing Rate / Pricing Calculator decisions need
 * per-design numbers, not one company-wide blend.
 */
async function summarizeByProduct(companyId, { from, to } = {}) {
  const params = [companyId];
  let dateClause = '';
  if (from && to) {
    params.push(from, to);
    dateClause = `AND r.created_at >= $2 AND r.created_at < $3`;
  }
  const { rows } = await query(
    `SELECT
       p.id AS product_id, p.name AS product_name,
       pc.id AS category_id, pc.name AS category_name,
       pv.id AS product_variant_id, pv.sku AS variant_sku,
       COUNT(*) AS total_returns,
       COUNT(*) FILTER (WHERE r.type = 'customer') AS customer_returns,
       COUNT(*) FILTER (WHERE r.type = 'courier') AS courier_returns,
       COUNT(*) FILTER (WHERE r.decision = 'scrap') AS scrapped_returns,
       COALESCE(SUM(r.amount) FILTER (WHERE r.decision = 'scrap'), 0) AS scrapped_amount
     FROM returns r
     JOIN product_variants pv ON pv.id = r.product_variant_id
     JOIN products p ON p.id = pv.product_id
     LEFT JOIN product_categories pc ON pc.id = p.category_id
     WHERE r.company_id = $1 AND r.is_deleted = FALSE ${dateClause}
     GROUP BY p.id, p.name, pc.id, pc.name, pv.id, pv.sku
     ORDER BY p.name, pv.sku`,
    params,
  );
  return rows.map((row) => {
    const totalReturns = Number(row.total_returns);
    return {
      productId: row.product_id,
      productName: row.product_name,
      categoryId: row.category_id,
      categoryName: row.category_name,
      productVariantId: row.product_variant_id,
      variantSku: row.variant_sku,
      totalReturns,
      customerReturnPercent: totalReturns ? Math.round((Number(row.customer_returns) / totalReturns) * 100) : 0,
      rtoPercent: totalReturns ? Math.round((Number(row.courier_returns) / totalReturns) * 100) : 0,
      damagePercent: totalReturns ? Math.round((Number(row.scrapped_returns) / totalReturns) * 100) : 0,
      scrappedAmount: Number(row.scrapped_amount),
    };
  });
}

module.exports = {
  generateReturnNumber,
  peekReturnNumber,
  create,
  findById,
  findByIdForUpdate,
  list,
  update,
  softDelete,
  summarize,
  summarizeByProduct,
};
