const { query } = require('../config/db');
const { buildListQuery } = require('../utils/queryBuilder');

async function list(companyId, pagination) {
  const { dataSql, dataParams, countSql, countParams } = buildListQuery({
    table: 'warehouse_zones',
    companyId,
    pagination,
    searchableColumns: ['name'],
  });
  const [data, count] = await Promise.all([query(dataSql, dataParams), query(countSql, countParams)]);
  return { rows: data.rows, totalRecords: parseInt(count.rows[0].count, 10) };
}

async function findById(companyId, id) {
  const { rows } = await query(`SELECT * FROM warehouse_zones WHERE id = $1 AND company_id = $2 AND is_deleted = FALSE`, [id, companyId]);
  return rows[0] || null;
}

async function create(companyId, { warehouseId, name, zoneType }, createdBy) {
  const { rows } = await query(
    `INSERT INTO warehouse_zones (company_id, warehouse_id, name, zone_type, created_by, updated_by)
     VALUES ($1, $2, $3, $4, $5, $5)
     RETURNING *`,
    [companyId, warehouseId, name, zoneType || 'storage', createdBy],
  );
  return rows[0];
}

async function update(companyId, id, { name, zoneType, status }, updatedBy) {
  const { rows } = await query(
    `UPDATE warehouse_zones
     SET name = COALESCE($3, name), zone_type = COALESCE($4, zone_type), status = COALESCE($5, status),
         updated_by = $6, updated_at = now()
     WHERE id = $1 AND company_id = $2 AND is_deleted = FALSE
     RETURNING *`,
    [id, companyId, name, zoneType, status, updatedBy],
  );
  return rows[0] || null;
}

async function softDelete(companyId, id, deletedBy) {
  const { rows } = await query(
    `UPDATE warehouse_zones SET is_deleted = TRUE, deleted_at = now(), deleted_by = $3
     WHERE id = $1 AND company_id = $2 AND is_deleted = FALSE
     RETURNING id`,
    [id, companyId, deletedBy],
  );
  return rows[0] || null;
}

module.exports = { list, findById, create, update, softDelete };
