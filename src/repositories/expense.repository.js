const { query } = require('../config/db');
const { buildListQuery } = require('../utils/queryBuilder');

async function create(client, companyId, { warehouseId, category, amount, description, recordedBy }, createdBy) {
  const { rows } = await client.query(
    `INSERT INTO expenses (company_id, warehouse_id, category, amount, description, recorded_by, created_by, updated_by)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $7)
     RETURNING *`,
    [companyId, warehouseId || null, category, amount, description || null, recordedBy, createdBy],
  );
  return rows[0];
}

async function list(companyId, pagination) {
  const { dataSql, dataParams, countSql, countParams } = buildListQuery({
    table: 'expenses',
    companyId,
    pagination,
    searchableColumns: ['category', 'description'],
  });
  const [data, count] = await Promise.all([query(dataSql, dataParams), query(countSql, countParams)]);
  return { rows: data.rows, totalRecords: parseInt(count.rows[0].count, 10) };
}

module.exports = { create, list };
