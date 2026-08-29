const { query } = require('../config/db');

async function peekSettlementNumber(runner = query) {
  const { rows } = await runner(
    `SELECT 'DSF-MPS-' || LPAD((CASE WHEN is_called THEN last_value + 1 ELSE last_value END)::text, 4, '0') AS settlement_number
     FROM marketplace_settlements_seq`,
  );
  return rows[0].settlement_number;
}

async function generateSettlementNumber(runner = query) {
  const { rows } = await runner(
    `SELECT 'DSF-MPS-' || LPAD(nextval('marketplace_settlements_seq')::text, 4, '0') AS settlement_number`,
  );
  return rows[0].settlement_number;
}

async function create(
  client,
  companyId,
  {
    settlementNumber, channelId, orderId, billId, productVariantId, settlementDate, returnType,
    grossSaleAmount, commissionAmount, shippingCharge, returnCharge, adsCharge,
    tcsAmount, tdsAmount, netAmountReceived, remarks,
  },
  createdBy,
) {
  const number = settlementNumber || (await generateSettlementNumber((text, params) => client.query(text, params)));
  const { rows } = await client.query(
    `INSERT INTO marketplace_settlements (
       company_id, channel_id, order_id, bill_id, product_variant_id, settlement_number, settlement_date, return_type,
       gross_sale_amount, commission_amount, shipping_charge, return_charge, ads_charge,
       tcs_amount, tds_amount, net_amount_received, remarks, created_by, updated_by
     )
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $18)
     RETURNING *`,
    [
      companyId,
      channelId,
      orderId || null,
      billId || null,
      productVariantId || null,
      number,
      settlementDate,
      returnType || 'none',
      grossSaleAmount || 0,
      commissionAmount || 0,
      shippingCharge || 0,
      returnCharge || 0,
      adsCharge || 0,
      tcsAmount || 0,
      tdsAmount || 0,
      netAmountReceived || 0,
      remarks || null,
      createdBy,
    ],
  );
  return rows[0];
}

async function findById(companyId, id) {
  const { rows } = await query(
    `SELECT ms.*, mc.name AS channel_name, o.order_number, b.bill_number AS invoice_number
     FROM marketplace_settlements ms
     JOIN marketplace_channels mc ON mc.id = ms.channel_id
     LEFT JOIN orders o ON o.id = ms.order_id
     LEFT JOIN bills b ON b.id = ms.bill_id
     WHERE ms.id = $1 AND ms.company_id = $2 AND ms.is_deleted = FALSE`,
    [id, companyId],
  );
  return rows[0] || null;
}

async function list(companyId, pagination, { channelId } = {}) {
  const { limit, offset, search } = pagination;
  const conditions = ['ms.company_id = $1', 'ms.is_deleted = FALSE'];
  const params = [companyId];
  if (channelId) {
    params.push(channelId);
    conditions.push(`ms.channel_id = $${params.length}`);
  }
  if (search) {
    params.push(`%${search}%`);
    conditions.push(`(ms.settlement_number ILIKE $${params.length} OR o.order_number ILIKE $${params.length} OR b.bill_number ILIKE $${params.length})`);
  }
  const whereClause = `WHERE ${conditions.join(' AND ')}`;

  const dataSql = `
    SELECT ms.*, mc.name AS channel_name, o.order_number, b.bill_number AS invoice_number
    FROM marketplace_settlements ms
    JOIN marketplace_channels mc ON mc.id = ms.channel_id
    LEFT JOIN orders o ON o.id = ms.order_id
    LEFT JOIN bills b ON b.id = ms.bill_id
    ${whereClause}
    ORDER BY ms.settlement_date DESC
    LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
  const countSql = `
    SELECT COUNT(*) FROM marketplace_settlements ms
    LEFT JOIN orders o ON o.id = ms.order_id
    LEFT JOIN bills b ON b.id = ms.bill_id
    ${whereClause}`;

  const [data, count] = await Promise.all([query(dataSql, [...params, limit, offset]), query(countSql, params)]);
  return { rows: data.rows, totalRecords: parseInt(count.rows[0].count, 10) };
}

/**
 * Real, actual-data replacement for marketplace_channels.default_cost_per_unit
 * — total non-tax deductions (commission+shipping+return+ads) this month
 * divided by units sold (gross_sale_amount rows), per channel. TCS/TDS
 * excluded — they are advance tax credits, not cost. CR%/RTO% bifurcated
 * straight off return_type.
 */
async function summarizeByChannelForMonth(companyId, monthStart, monthEnd) {
  const { rows } = await query(
    `SELECT
       ms.channel_id, mc.name AS channel_name,
       COUNT(*) AS total_orders,
       COUNT(*) FILTER (WHERE ms.return_type = 'customer') AS customer_returns,
       COUNT(*) FILTER (WHERE ms.return_type = 'courier') AS rto_returns,
       COALESCE(SUM(ms.commission_amount + ms.shipping_charge + ms.return_charge + ms.ads_charge), 0) AS total_marketplace_cost,
       COALESCE(SUM(ms.tcs_amount), 0) AS total_tcs,
       COALESCE(SUM(ms.tds_amount), 0) AS total_tds,
       COALESCE(SUM(ms.net_amount_received), 0) AS total_net_received
     FROM marketplace_settlements ms
     JOIN marketplace_channels mc ON mc.id = ms.channel_id
     WHERE ms.company_id = $1 AND ms.is_deleted = FALSE
       AND ms.settlement_date >= $2 AND ms.settlement_date < $3
     GROUP BY ms.channel_id, mc.name`,
    [companyId, monthStart, monthEnd],
  );
  return rows.map((row) => {
    const totalOrders = Number(row.total_orders);
    return {
      channelId: row.channel_id,
      channelName: row.channel_name,
      totalOrders,
      customerReturnPercent: totalOrders ? Math.round((Number(row.customer_returns) / totalOrders) * 100) : 0,
      rtoPercent: totalOrders ? Math.round((Number(row.rto_returns) / totalOrders) * 100) : 0,
      actualCostPerUnit: totalOrders ? Number(row.total_marketplace_cost) / totalOrders : 0,
      totalTcs: Number(row.total_tcs),
      totalTds: Number(row.total_tds),
      totalNetReceived: Number(row.total_net_received),
    };
  });
}

/**
 * Same actual-cost/return-rate breakdown as summarizeByChannelForMonth, but
 * sliced per product/category/variant instead of company-wide — a "Sandal"
 * design and a "Sneaker" design don't share one return rate or marketplace
 * cost, so pricing per design needs its own numbers, not a blanket average.
 * Only settlements with a product_variant_id contribute (older/bulk entries
 * without one are excluded from this view, not from the channel-wide one).
 */
async function summarizeByProductForMonth(companyId, monthStart, monthEnd) {
  const { rows } = await query(
    `SELECT
       p.id AS product_id, p.name AS product_name,
       pc.id AS category_id, pc.name AS category_name,
       pv.id AS product_variant_id, pv.sku AS variant_sku,
       COUNT(*) AS total_orders,
       COUNT(*) FILTER (WHERE ms.return_type = 'customer') AS customer_returns,
       COUNT(*) FILTER (WHERE ms.return_type = 'courier') AS rto_returns,
       COALESCE(SUM(ms.commission_amount + ms.shipping_charge + ms.return_charge + ms.ads_charge), 0) AS total_marketplace_cost
     FROM marketplace_settlements ms
     JOIN product_variants pv ON pv.id = ms.product_variant_id
     JOIN products p ON p.id = pv.product_id
     LEFT JOIN product_categories pc ON pc.id = p.category_id
     WHERE ms.company_id = $1 AND ms.is_deleted = FALSE AND ms.product_variant_id IS NOT NULL
       AND ms.settlement_date >= $2 AND ms.settlement_date < $3
     GROUP BY p.id, p.name, pc.id, pc.name, pv.id, pv.sku
     ORDER BY p.name, pv.sku`,
    [companyId, monthStart, monthEnd],
  );
  return rows.map((row) => {
    const totalOrders = Number(row.total_orders);
    return {
      productId: row.product_id,
      productName: row.product_name,
      categoryId: row.category_id,
      categoryName: row.category_name,
      productVariantId: row.product_variant_id,
      variantSku: row.variant_sku,
      totalOrders,
      customerReturnPercent: totalOrders ? Math.round((Number(row.customer_returns) / totalOrders) * 100) : 0,
      rtoPercent: totalOrders ? Math.round((Number(row.rto_returns) / totalOrders) * 100) : 0,
      actualCostPerUnit: totalOrders ? Number(row.total_marketplace_cost) / totalOrders : 0,
    };
  });
}

/** Real all-time-so-far revenue share per channel — the "own data" replacement for the generic market channel-mix assumption once enough settlements exist. */
async function totalByChannelSince(companyId, sinceDate) {
  const { rows } = await query(
    `SELECT ms.channel_id, mc.name AS channel_name, COALESCE(SUM(ms.gross_sale_amount), 0) AS total
     FROM marketplace_settlements ms
     JOIN marketplace_channels mc ON mc.id = ms.channel_id
     WHERE ms.company_id = $1 AND ms.is_deleted = FALSE AND ms.settlement_date >= $2
     GROUP BY ms.channel_id, mc.name`,
    [companyId, sinceDate],
  );
  return rows;
}

module.exports = {
  peekSettlementNumber,
  generateSettlementNumber,
  create,
  findById,
  list,
  summarizeByChannelForMonth,
  summarizeByProductForMonth,
  totalByChannelSince,
};
