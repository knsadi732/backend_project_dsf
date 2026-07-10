const { query } = require('../config/db');
const { buildListQuery } = require('../utils/queryBuilder');

async function list(companyId, pagination, { branchId } = {}) {
  const extraConditions = [];
  const extraParams = [];
  if (branchId) {
    extraConditions.push(`branch_id = $${extraParams.length + 2}`);
    extraParams.push(branchId);
  }

  const { dataSql, dataParams, countSql, countParams } = buildListQuery({
    table: 'warehouses',
    companyId,
    pagination,
    searchableColumns: ['name', 'code'],
    extraConditions,
    extraParams,
  });
  const [data, count] = await Promise.all([query(dataSql, dataParams), query(countSql, countParams)]);
  return { rows: data.rows, totalRecords: parseInt(count.rows[0].count, 10) };
}

async function findById(companyId, id) {
  const { rows } = await query(
    `SELECT * FROM warehouses WHERE id = $1 AND company_id = $2 AND is_deleted = FALSE`,
    [id, companyId],
  );
  return rows[0] || null;
}

async function create(companyId, { branchId, name, code, address }, createdBy) {
  const { rows } = await query(
    `INSERT INTO warehouses (company_id, branch_id, name, code, address, created_by, updated_by)
     VALUES ($1, $2, $3, $4, $5, $6, $6)
     RETURNING *`,
    [companyId, branchId, name, code, address, createdBy],
  );
  return rows[0];
}

async function update(companyId, id, { name, code, address, status }, updatedBy) {
  const { rows } = await query(
    `UPDATE warehouses
     SET name = COALESCE($3, name), code = COALESCE($4, code), address = COALESCE($5, address),
         status = COALESCE($6, status), updated_by = $7, updated_at = now()
     WHERE id = $1 AND company_id = $2 AND is_deleted = FALSE
     RETURNING *`,
    [id, companyId, name, code, address, status, updatedBy],
  );
  return rows[0] || null;
}

async function softDelete(companyId, id, deletedBy) {
  const { rows } = await query(
    `UPDATE warehouses SET is_deleted = TRUE, deleted_at = now(), deleted_by = $3
     WHERE id = $1 AND company_id = $2 AND is_deleted = FALSE
     RETURNING id`,
    [id, companyId, deletedBy],
  );
  return rows[0] || null;
}

module.exports = { list, findById, create, update, softDelete };
