const { query } = require('../config/db');
const { buildListQuery } = require('../utils/queryBuilder');

/** Reserves and returns the next auto-generated SKU suffix. Each call consumes the sequence. */
async function generateSku(runner = query) {
  const { rows } = await runner(`SELECT 'DSF-SKU-' || LPAD(nextval('product_variants_sku_seq')::text, 6, '0') AS sku`);
  return rows[0].sku;
}

/** Previews the next SKU without consuming the sequence — safe to call repeatedly. */
async function peekSku(runner = query) {
  const { rows } = await runner(
    `SELECT 'DSF-SKU-' || LPAD((CASE WHEN is_called THEN last_value + 1 ELSE last_value END)::text, 6, '0') AS sku
     FROM product_variants_sku_seq`,
  );
  return rows[0].sku;
}

async function list(companyId, pagination, { productId, variantGroupId, status, productType } = {}) {
  const extraConditions = [];
  const extraParams = [];
  if (productId) {
    extraConditions.push(`product_id = $${extraParams.length + 2}`);
    extraParams.push(productId);
  }
  if (variantGroupId) {
    extraConditions.push(`variant_group_id = $${extraParams.length + 2}`);
    extraParams.push(variantGroupId);
  }
  if (status) {
    extraConditions.push(`status = $${extraParams.length + 2}`);
    extraParams.push(status);
  }
  if (productType) {
    extraConditions.push(
      `product_id IN (SELECT id FROM products WHERE company_id = $1 AND product_type = $${extraParams.length + 2})`,
    );
    extraParams.push(productType);
  }

  const { dataSql, dataParams, countSql, countParams } = buildListQuery({
    table: 'product_variants',
    companyId,
    pagination,
    searchableColumns: ['sku', 'barcode'],
    extraConditions,
    extraParams,
  });
  const [data, count] = await Promise.all([query(dataSql, dataParams), query(countSql, countParams)]);
  return { rows: data.rows, totalRecords: parseInt(count.rows[0].count, 10) };
}

async function findById(companyId, id) {
  const { rows } = await query(
    `SELECT * FROM product_variants WHERE id = $1 AND company_id = $2 AND is_deleted = FALSE`,
    [id, companyId],
  );
  return rows[0] || null;
}

async function create(
  companyId,
  { productId, variantGroupId, sku, barcode, size, color, weight, mrp, sellingPrice, wholesalePrice, dealerPrice, costPrice },
  createdBy,
) {
  const resolvedSku = sku || (await generateSku());
  const { rows } = await query(
    `INSERT INTO product_variants (
       company_id, product_id, variant_group_id, sku, barcode, size, color, weight, mrp, selling_price,
       wholesale_price, dealer_price, cost_price, created_by, updated_by
     )
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $14)
     RETURNING *`,
    [
      companyId,
      productId,
      variantGroupId || null,
      resolvedSku,
      barcode || null,
      size || null,
      color || null,
      weight || null,
      mrp ?? 0,
      sellingPrice ?? 0,
      wholesalePrice || null,
      dealerPrice || null,
      costPrice ?? 0,
      createdBy,
    ],
  );
  return rows[0];
}

async function update(companyId, id, fields, updatedBy) {
  const { rows } = await query(
    `UPDATE product_variants
     SET variant_group_id = COALESCE($3, variant_group_id), barcode = COALESCE($4, barcode),
         size = COALESCE($5, size), color = COALESCE($6, color),
         weight = COALESCE($7, weight), mrp = COALESCE($8, mrp), selling_price = COALESCE($9, selling_price),
         wholesale_price = COALESCE($10, wholesale_price), dealer_price = COALESCE($11, dealer_price),
         cost_price = COALESCE($12, cost_price), status = COALESCE($13, status),
         updated_by = $14, updated_at = now()
     WHERE id = $1 AND company_id = $2 AND is_deleted = FALSE
     RETURNING *`,
    [
      id,
      companyId,
      fields.variantGroupId,
      fields.barcode,
      fields.size,
      fields.color,
      fields.weight,
      fields.mrp,
      fields.sellingPrice,
      fields.wholesalePrice,
      fields.dealerPrice,
      fields.costPrice,
      fields.status,
      updatedBy,
    ],
  );
  return rows[0] || null;
}

async function softDelete(companyId, id, deletedBy) {
  const { rows } = await query(
    `UPDATE product_variants SET is_deleted = TRUE, deleted_at = now(), deleted_by = $3
     WHERE id = $1 AND company_id = $2 AND is_deleted = FALSE
     RETURNING id`,
    [id, companyId, deletedBy],
  );
  return rows[0] || null;
}

module.exports = { generateSku, peekSku, list, findById, create, update, softDelete };
