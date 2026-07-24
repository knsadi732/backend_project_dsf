const { query } = require('../config/db');
const { buildListQuery } = require('../utils/queryBuilder');

async function list(companyId, pagination) {
  const { dataSql, dataParams, countSql, countParams } = buildListQuery({
    table: 'brands',
    companyId,
    pagination,
    searchableColumns: ['name'],
  });
  const [data, count] = await Promise.all([query(dataSql, dataParams), query(countSql, countParams)]);
  return { rows: data.rows, totalRecords: parseInt(count.rows[0].count, 10) };
}

async function findById(companyId, id) {
  const { rows } = await query(`SELECT * FROM brands WHERE id = $1 AND company_id = $2 AND is_deleted = FALSE`, [
    id,
    companyId,
  ]);
  return rows[0] || null;
}

async function create(companyId, { name, brandCode, country, description, tagline }, createdBy) {
  const { rows } = await query(
    `INSERT INTO brands (company_id, name, brand_code, country, description, tagline, created_by, updated_by)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $7)
     RETURNING *`,
    [companyId, name, brandCode || null, country || null, description || null, tagline || null, createdBy],
  );
  return rows[0];
}

async function update(companyId, id, { name, brandCode, country, description, tagline, status }, updatedBy) {
  const { rows } = await query(
    `UPDATE brands
     SET name = COALESCE($3, name), brand_code = COALESCE($4, brand_code), country = COALESCE($5, country),
         description = COALESCE($6, description), tagline = COALESCE($7, tagline), status = COALESCE($8, status),
         updated_by = $9, updated_at = now()
     WHERE id = $1 AND company_id = $2 AND is_deleted = FALSE
     RETURNING *`,
    [id, companyId, name, brandCode, country, description, tagline, status, updatedBy],
  );
  return rows[0] || null;
}

async function softDelete(companyId, id, deletedBy) {
  const { rows } = await query(
    `UPDATE brands SET is_deleted = TRUE, deleted_at = now(), deleted_by = $3
     WHERE id = $1 AND company_id = $2 AND is_deleted = FALSE
     RETURNING id`,
    [id, companyId, deletedBy],
  );
  return rows[0] || null;
}

module.exports = { list, findById, create, update, softDelete };
