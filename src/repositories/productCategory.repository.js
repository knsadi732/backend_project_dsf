const { query } = require('../config/db');
const { buildListQuery } = require('../utils/queryBuilder');

async function list(companyId, pagination) {
  const { dataSql, dataParams, countSql, countParams } = buildListQuery({
    table: 'product_categories',
    companyId,
    pagination,
    searchableColumns: ['name'],
  });
  const [data, count] = await Promise.all([query(dataSql, dataParams), query(countSql, countParams)]);
  return { rows: data.rows, totalRecords: parseInt(count.rows[0].count, 10) };
}

async function findById(companyId, id) {
  const { rows } = await query(
    `SELECT * FROM product_categories WHERE id = $1 AND company_id = $2 AND is_deleted = FALSE`,
    [id, companyId],
  );
  return rows[0] || null;
}

async function create(companyId, { parentId, name }, createdBy) {
  const { rows } = await query(
    `INSERT INTO product_categories (company_id, parent_id, name, created_by, updated_by)
     VALUES ($1, $2, $3, $4, $4)
     RETURNING *`,
    [companyId, parentId || null, name, createdBy],
  );
  return rows[0];
}

async function update(companyId, id, { name, status }, updatedBy) {
  const { rows } = await query(
    `UPDATE product_categories
     SET name = COALESCE($3, name), status = COALESCE($4, status), updated_by = $5, updated_at = now()
     WHERE id = $1 AND company_id = $2 AND is_deleted = FALSE
     RETURNING *`,
    [id, companyId, name, status, updatedBy],
  );
  return rows[0] || null;
}

async function softDelete(companyId, id, deletedBy) {
  const { rows } = await query(
    `UPDATE product_categories SET is_deleted = TRUE, deleted_at = now(), deleted_by = $3
     WHERE id = $1 AND company_id = $2 AND is_deleted = FALSE
     RETURNING id`,
    [id, companyId, deletedBy],
  );
  return rows[0] || null;
}

module.exports = { list, findById, create, update, softDelete };
