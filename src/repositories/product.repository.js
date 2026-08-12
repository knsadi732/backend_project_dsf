const { query } = require('../config/db');
const { buildListQuery } = require('../utils/queryBuilder');

async function list(companyId, pagination, { categoryId, brandId } = {}) {
  const extraConditions = [];
  const extraParams = [];
  if (categoryId) {
    extraConditions.push(`category_id = $${extraParams.length + 2}`);
    extraParams.push(categoryId);
  }
  if (brandId) {
    extraConditions.push(`brand_id = $${extraParams.length + 2}`);
    extraParams.push(brandId);
  }

  const { dataSql, dataParams, countSql, countParams } = buildListQuery({
    table: 'products',
    companyId,
    pagination,
    searchableColumns: ['name'],
    extraConditions,
    extraParams,
  });
  const [data, count] = await Promise.all([query(dataSql, dataParams), query(countSql, countParams)]);

  const brandIds = [...new Set(data.rows.map((r) => r.brand_id).filter(Boolean))];
  let brandMap = {};
  if (brandIds.length) {
    const { rows: brands } = await query(
      `SELECT id, name, brand_code, country, tagline FROM brands
       WHERE company_id = $1 AND id = ANY($2) AND is_deleted = FALSE`,
      [companyId, brandIds],
    );
    brandMap = Object.fromEntries(brands.map((b) => [b.id, b]));
  }
  const rows = data.rows.map((r) => ({ ...r, brand: brandMap[r.brand_id] || null }));

  return { rows, totalRecords: parseInt(count.rows[0].count, 10) };
}

async function findById(companyId, id) {
  const { rows } = await query(
    `SELECT p.*, b.name AS brand_name, b.brand_code AS brand_code, b.country AS brand_country,
            b.tagline AS brand_tagline
     FROM products p
     LEFT JOIN brands b ON b.id = p.brand_id AND b.company_id = p.company_id AND b.is_deleted = FALSE
     WHERE p.id = $1 AND p.company_id = $2 AND p.is_deleted = FALSE`,
    [id, companyId],
  );
  const row = rows[0];
  if (!row) return null;
  const { brand_name, brand_code, brand_country, brand_tagline, ...product } = row;
  product.brand = product.brand_id
    ? { id: product.brand_id, name: brand_name, brand_code, country: brand_country, tagline: brand_tagline }
    : null;
  return product;
}

const NOT_SELLABLE_BY_DEFAULT = new Set(['raw_material', 'packaging_material', 'consumable', 'asset']);

async function create(companyId, fields, createdBy) {
  const productType = fields.productType || 'finished_goods';
  const { rows } = await query(
    `INSERT INTO products (
       company_id, category_id, brand_id, product_code, name, description, gender, uom, hsn_code, gst_percentage,
       product_type, is_sellable, bom_required, production_required, packaging_required, created_by, updated_by
     )
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $16)
     RETURNING *`,
    [
      companyId,
      fields.categoryId || null,
      fields.brandId || null,
      fields.productCode || null,
      fields.name,
      fields.description || null,
      fields.gender || null,
      fields.uom || 'pair',
      fields.hsnCode || null,
      fields.gstPercentage ?? 0,
      productType,
      fields.isSellable ?? !NOT_SELLABLE_BY_DEFAULT.has(productType),
      fields.bomRequired ?? false,
      fields.productionRequired ?? false,
      fields.packagingRequired ?? false,
      createdBy,
    ],
  );
  return rows[0];
}

async function update(companyId, id, fields, updatedBy) {
  const { rows } = await query(
    `UPDATE products
     SET category_id = COALESCE($3, category_id), brand_id = COALESCE($4, brand_id),
         product_code = COALESCE($5, product_code), name = COALESCE($6, name),
         description = COALESCE($7, description), gender = COALESCE($8, gender), uom = COALESCE($9, uom),
         hsn_code = COALESCE($10, hsn_code), gst_percentage = COALESCE($11, gst_percentage),
         product_type = COALESCE($12, product_type), is_sellable = COALESCE($13, is_sellable),
         bom_required = COALESCE($14, bom_required),
         production_required = COALESCE($15, production_required), packaging_required = COALESCE($16, packaging_required),
         status = COALESCE($17, status), updated_by = $18, updated_at = now()
     WHERE id = $1 AND company_id = $2 AND is_deleted = FALSE
     RETURNING *`,
    [
      id,
      companyId,
      fields.categoryId,
      fields.brandId,
      fields.productCode,
      fields.name,
      fields.description,
      fields.gender,
      fields.uom,
      fields.hsnCode,
      fields.gstPercentage,
      fields.productType,
      fields.isSellable,
      fields.bomRequired,
      fields.productionRequired,
      fields.packagingRequired,
      fields.status,
      updatedBy,
    ],
  );
  return rows[0] || null;
}

async function softDelete(companyId, id, deletedBy) {
  const { rows } = await query(
    `UPDATE products SET is_deleted = TRUE, deleted_at = now(), deleted_by = $3
     WHERE id = $1 AND company_id = $2 AND is_deleted = FALSE
     RETURNING id`,
    [id, companyId, deletedBy],
  );
  return rows[0] || null;
}

module.exports = { list, findById, create, update, softDelete };
