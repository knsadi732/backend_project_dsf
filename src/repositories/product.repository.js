const { query } = require('../config/db');
const { buildListQuery } = require('../utils/queryBuilder');

async function list(companyId, pagination, { categoryId } = {}) {
  const extraConditions = [];
  const extraParams = [];
  if (categoryId) {
    extraConditions.push(`category_id = $${extraParams.length + 2}`);
    extraParams.push(categoryId);
  }

  const { dataSql, dataParams, countSql, countParams } = buildListQuery({
    table: 'products',
    companyId,
    pagination,
    searchableColumns: ['name', 'sku'],
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

async function findBySku(companyId, sku) {
  const { rows } = await query(`SELECT * FROM products WHERE sku = $1 AND company_id = $2 AND is_deleted = FALSE`, [
    sku,
    companyId,
  ]);
  return rows[0] || null;
}

async function create(companyId, fields, createdBy) {
  const { rows } = await query(
    `INSERT INTO products (company_id, category_id, sku, name, description, uom, unit_price, cost_price, tax_rate, created_by, updated_by)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $10)
     RETURNING *`,
    [
      companyId,
      fields.categoryId || null,
      fields.sku,
      fields.name,
      fields.description || null,
      fields.uom || 'pair',
      fields.unitPrice ?? 0,
      fields.costPrice ?? 0,
      fields.taxRate ?? 0,
      createdBy,
    ],
  );
  return rows[0];
}

async function update(companyId, id, fields, updatedBy) {
  const { rows } = await query(
    `UPDATE products
     SET category_id = COALESCE($3, category_id), name = COALESCE($4, name),
         description = COALESCE($5, description), uom = COALESCE($6, uom),
         unit_price = COALESCE($7, unit_price), cost_price = COALESCE($8, cost_price),
         tax_rate = COALESCE($9, tax_rate), status = COALESCE($10, status),
         updated_by = $11, updated_at = now()
     WHERE id = $1 AND company_id = $2 AND is_deleted = FALSE
     RETURNING *`,
    [
      id,
      companyId,
      fields.categoryId,
      fields.name,
      fields.description,
      fields.uom,
      fields.unitPrice,
      fields.costPrice,
      fields.taxRate,
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

module.exports = { list, findById, findBySku, create, update, softDelete };
