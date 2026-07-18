const { query } = require('../config/db');

async function list(companyId, pagination) {
  const { limit, offset, sortOrder } = pagination;
  const safeSortOrder = sortOrder === 'asc' ? 'ASC' : 'DESC';
  const [data, count] = await Promise.all([
    query(
      `SELECT * FROM statutory_audits WHERE company_id = $1 AND is_deleted = FALSE
       ORDER BY conducted_at ${safeSortOrder} LIMIT $2 OFFSET $3`,
      [companyId, limit, offset],
    ),
    query(`SELECT COUNT(*) FROM statutory_audits WHERE company_id = $1 AND is_deleted = FALSE`, [companyId]),
  ]);
  return { rows: data.rows, totalRecords: parseInt(count.rows[0].count, 10) };
}

async function create(companyId, { fiscalPeriodId, auditorName, conductedAt, findings, remarks }, createdBy) {
  const { rows } = await query(
    `INSERT INTO statutory_audits (company_id, fiscal_period_id, auditor_name, conducted_at, findings, remarks, created_by, updated_by)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $7)
     RETURNING *`,
    [companyId, fiscalPeriodId || null, auditorName, conductedAt, findings || null, remarks || null, createdBy],
  );
  return rows[0];
}

module.exports = { list, create };
