const { query } = require('../config/db');
const { buildListQuery } = require('../utils/queryBuilder');

async function list(companyId, pagination, { shelfId } = {}) {
  const { dataSql, dataParams, countSql, countParams } = buildListQuery({
    table: 'bins',
    companyId,
    pagination,
    searchableColumns: ['code'],
    extraConditions: shelfId ? ['shelf_id = $2'] : [],
    extraParams: shelfId ? [shelfId] : [],
  });
  const [data, count] = await Promise.all([query(dataSql, dataParams), query(countSql, countParams)]);
  return { rows: data.rows, totalRecords: parseInt(count.rows[0].count, 10) };
}

async function findById(companyId, id) {
  const { rows } = await query(`SELECT * FROM bins WHERE id = $1 AND company_id = $2 AND is_deleted = FALSE`, [id, companyId]);
  return rows[0] || null;
}

async function create(companyId, { shelfId, code, capacity, currentQuantity }, createdBy) {
  const { rows } = await query(
    `INSERT INTO bins (company_id, shelf_id, code, capacity, current_quantity, created_by, updated_by)
     VALUES ($1, $2, $3, $4, $5, $6, $6)
     RETURNING *`,
    [companyId, shelfId, code, capacity ?? 0, currentQuantity ?? 0, createdBy],
  );
  return rows[0];
}

async function update(companyId, id, { code, capacity, currentQuantity, status }, updatedBy) {
  const { rows } = await query(
    `UPDATE bins
     SET code = COALESCE($3, code), capacity = COALESCE($4, capacity),
         current_quantity = COALESCE($5, current_quantity), status = COALESCE($6, status),
         updated_by = $7, updated_at = now()
     WHERE id = $1 AND company_id = $2 AND is_deleted = FALSE
     RETURNING *`,
    [id, companyId, code, capacity, currentQuantity, status, updatedBy],
  );
  return rows[0] || null;
}

async function softDelete(companyId, id, deletedBy) {
  const { rows } = await query(
    `UPDATE bins SET is_deleted = TRUE, deleted_at = now(), deleted_by = $3
     WHERE id = $1 AND company_id = $2 AND is_deleted = FALSE
     RETURNING id`,
    [id, companyId, deletedBy],
  );
  return rows[0] || null;
}

module.exports = { list, findById, create, update, softDelete };
