const { query } = require('../config/db');
const { buildListQuery } = require('../utils/queryBuilder');

async function create(companyId, { partyName, partyType, defaultFundingType, contactInfo }, createdBy) {
  const { rows } = await query(
    `INSERT INTO funding_sources (company_id, party_name, party_type, default_funding_type, contact_info, created_by, updated_by)
     VALUES ($1, $2, $3, $4, $5, $6, $6)
     RETURNING *`,
    [companyId, partyName, partyType || 'individual', defaultFundingType || 'advance', contactInfo || null, createdBy],
  );
  return rows[0];
}

async function findById(companyId, id) {
  const { rows } = await query(`SELECT * FROM funding_sources WHERE id = $1 AND company_id = $2 AND is_deleted = FALSE`, [
    id,
    companyId,
  ]);
  return rows[0] || null;
}

async function list(companyId, pagination) {
  const { dataSql, dataParams, countSql, countParams } = buildListQuery({
    table: 'funding_sources',
    companyId,
    pagination,
    searchableColumns: ['party_name', 'contact_info'],
  });
  const [data, count] = await Promise.all([query(dataSql, dataParams), query(countSql, countParams)]);
  return { rows: data.rows, totalRecords: parseInt(count.rows[0].count, 10) };
}

module.exports = { create, findById, list };
