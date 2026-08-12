const { query } = require('../config/db');

async function create(
  client,
  companyId,
  { rfqId, vendorId, deliveryTimeDays, paymentTerms, validityDate, freightAmount, discountAmount, remarks },
  createdBy,
) {
  const { rows } = await client.query(
    `INSERT INTO vendor_quotations (
       company_id, rfq_id, vendor_id, delivery_time_days, payment_terms, validity_date,
       freight_amount, discount_amount, remarks, created_by, updated_by
     )
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $10)
     RETURNING *`,
    [
      companyId,
      rfqId,
      vendorId,
      deliveryTimeDays ?? null,
      paymentTerms || null,
      validityDate || null,
      freightAmount ?? 0,
      discountAmount ?? 0,
      remarks || null,
      createdBy,
    ],
  );
  return rows[0];
}

async function createItems(client, vendorQuotationId, items) {
  for (const item of items) {
    await client.query(
      `INSERT INTO vendor_quotation_items (vendor_quotation_id, product_variant_id, unit_price, gst_percentage)
       VALUES ($1, $2, $3, $4)`,
      [vendorQuotationId, item.productVariantId, item.unitPrice, item.gstPercentage ?? 0],
    );
  }
}

async function findItems(vendorQuotationId, runner = query) {
  const { rows } = await runner(
    `SELECT vqi.*, pv.sku, pv.size, pv.color, p.name AS product_name
     FROM vendor_quotation_items vqi
     LEFT JOIN product_variants pv ON pv.id = vqi.product_variant_id
     LEFT JOIN products p ON p.id = pv.product_id
     WHERE vqi.vendor_quotation_id = $1`,
    [vendorQuotationId],
  );
  return rows;
}

async function findById(companyId, id) {
  const { rows } = await query(
    `SELECT vq.*, v.name AS vendor_name, v.quality_rating
     FROM vendor_quotations vq
     LEFT JOIN vendors v ON v.id = vq.vendor_id
     WHERE vq.id = $1 AND vq.company_id = $2 AND vq.is_deleted = FALSE`,
    [id, companyId],
  );
  return rows[0] || null;
}

async function findByVendorAndRfq(companyId, rfqId, vendorId) {
  const { rows } = await query(
    `SELECT * FROM vendor_quotations WHERE company_id = $1 AND rfq_id = $2 AND vendor_id = $3 AND is_deleted = FALSE`,
    [companyId, rfqId, vendorId],
  );
  return rows[0] || null;
}

/** Comparison view for an RFQ (plan.md 11.20): one row per vendor's quotation, priced items included. */
async function findByRfqId(companyId, rfqId) {
  const { rows } = await query(
    `SELECT vq.*, v.name AS vendor_name, v.quality_rating
     FROM vendor_quotations vq
     LEFT JOIN vendors v ON v.id = vq.vendor_id
     WHERE vq.company_id = $1 AND vq.rfq_id = $2 AND vq.is_deleted = FALSE
     ORDER BY vq.created_at ASC`,
    [companyId, rfqId],
  );

  const quotationIds = rows.map((r) => r.id);
  let itemsByQuotation = {};
  if (quotationIds.length) {
    const { rows: items } = await query(
      `SELECT vqi.*, pv.sku, pv.size, pv.color, p.name AS product_name
       FROM vendor_quotation_items vqi
       LEFT JOIN product_variants pv ON pv.id = vqi.product_variant_id
       LEFT JOIN products p ON p.id = pv.product_id
       WHERE vqi.vendor_quotation_id = ANY($1)`,
      [quotationIds],
    );
    itemsByQuotation = items.reduce((acc, item) => {
      (acc[item.vendor_quotation_id] ||= []).push(item);
      return acc;
    }, {});
  }

  return rows.map((r) => ({ ...r, items: itemsByQuotation[r.id] || [] }));
}

module.exports = { create, createItems, findItems, findById, findByVendorAndRfq, findByRfqId };
