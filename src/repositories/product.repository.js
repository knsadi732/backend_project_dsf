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
  return { rows: data.rows, totalRecords: parseInt(count.rows[0].count, 10) };
}

async function findById(companyId, id) {
  const { rows } = await query(`SELECT * FROM products WHERE id = $1 AND company_id = $2 AND is_deleted = FALSE`, [
    id,
    companyId,
  ]);
  return rows[0] || null;
}

async function create(companyId, fields, createdBy) {
  const { rows } = await query(
    `INSERT INTO products (
       company_id, category_id, brand_id, name, description, uom, hsn_code, gst_percentage,
       product_type, bom_required, production_required, packaging_required, created_by, updated_by
     )
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $13)
     RETURNING *`,
    [
      companyId,
      fields.categoryId || null,
      fields.brandId || null,
      fields.name,
      fields.description || null,
      fields.uom || 'pair',
      fields.hsnCode || null,
      fields.gstPercentage ?? 0,
      fields.productType || 'finished_goods',
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
         name = COALESCE($5, name), description = COALESCE($6, description), uom = COALESCE($7, uom),
         hsn_code = COALESCE($8, hsn_code), gst_percentage = COALESCE($9, gst_percentage),
         product_type = COALESCE($10, product_type), bom_required = COALESCE($11, bom_required),
         production_required = COALESCE($12, production_required), packaging_required = COALESCE($13, packaging_required),
         status = COALESCE($14, status), updated_by = $15, updated_at = now()
     WHERE id = $1 AND company_id = $2 AND is_deleted = FALSE
     RETURNING *`,
    [
      id,
      companyId,
      fields.categoryId,
      fields.brandId,
      fields.name,
      fields.description,
      fields.uom,
      fields.hsnCode,
      fields.gstPercentage,
      fields.productType,
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
