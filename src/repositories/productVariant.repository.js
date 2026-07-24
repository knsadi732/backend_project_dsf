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

async function list(companyId, pagination, { productId, status } = {}) {
  const extraConditions = [];
  const extraParams = [];
  if (productId) {
    extraConditions.push(`product_id = $${extraParams.length + 2}`);
    extraParams.push(productId);
  }
  if (status) {
    extraConditions.push(`status = $${extraParams.length + 2}`);
    extraParams.push(status);
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

async function create(companyId, { productId, sku, barcode, size, color, weight, mrp, sellingPrice, wholesalePrice, dealerPrice, costPrice }, createdBy) {
  const resolvedSku = sku || (await generateSku());
  const { rows } = await query(
    `INSERT INTO product_variants (
       company_id, product_id, sku, barcode, size, color, weight, mrp, selling_price,
       wholesale_price, dealer_price, cost_price, created_by, updated_by
     )
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $13)
     RETURNING *`,
    [
      companyId,
      productId,
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
     SET barcode = COALESCE($3, barcode), size = COALESCE($4, size), color = COALESCE($5, color),
         weight = COALESCE($6, weight), mrp = COALESCE($7, mrp), selling_price = COALESCE($8, selling_price),
         wholesale_price = COALESCE($9, wholesale_price), dealer_price = COALESCE($10, dealer_price),
         cost_price = COALESCE($11, cost_price), status = COALESCE($12, status),
         updated_by = $13, updated_at = now()
     WHERE id = $1 AND company_id = $2 AND is_deleted = FALSE
     RETURNING *`,
    [
      id,
      companyId,
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
