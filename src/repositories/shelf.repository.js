const { query } = require('../config/db');
const { buildListQuery } = require('../utils/queryBuilder');

async function list(companyId, pagination, { rackId } = {}) {
  const { dataSql, dataParams, countSql, countParams } = buildListQuery({
    table: 'shelves',
    companyId,
    pagination,
    searchableColumns: ['code'],
    extraConditions: rackId ? ['rack_id = $2'] : [],
    extraParams: rackId ? [rackId] : [],
  });
  const [data, count] = await Promise.all([query(dataSql, dataParams), query(countSql, countParams)]);
  return { rows: data.rows, totalRecords: parseInt(count.rows[0].count, 10) };
}

async function findById(companyId, id) {
  const { rows } = await query(`SELECT * FROM shelves WHERE id = $1 AND company_id = $2 AND is_deleted = FALSE`, [id, companyId]);
  return rows[0] || null;
}

async function create(companyId, { rackId, code, capacity }, createdBy) {
  const { rows } = await query(
    `INSERT INTO shelves (company_id, rack_id, code, capacity, created_by, updated_by)
     VALUES ($1, $2, $3, $4, $5, $5)
     RETURNING *`,
    [companyId, rackId, code, capacity ?? 0, createdBy],
  );
  return rows[0];
}

async function update(companyId, id, { code, capacity, status }, updatedBy) {
  const { rows } = await query(
    `UPDATE shelves
     SET code = COALESCE($3, code), capacity = COALESCE($4, capacity), status = COALESCE($5, status),
         updated_by = $6, updated_at = now()
     WHERE id = $1 AND company_id = $2 AND is_deleted = FALSE
     RETURNING *`,
    [id, companyId, code, capacity, status, updatedBy],
  );
  return rows[0] || null;
}

async function softDelete(companyId, id, deletedBy) {
  const { rows } = await query(
    `UPDATE shelves SET is_deleted = TRUE, deleted_at = now(), deleted_by = $3
     WHERE id = $1 AND company_id = $2 AND is_deleted = FALSE
     RETURNING id`,
    [id, companyId, deletedBy],
  );
  return rows[0] || null;
}

module.exports = { list, findById, create, update, softDelete };
