const { query } = require('../config/db');

async function list(companyId, pagination) {
  const { limit, offset, sortOrder } = pagination;
  const safeSortOrder = sortOrder === 'asc' ? 'ASC' : 'DESC';
  const [data, count] = await Promise.all([
    query(
      `SELECT * FROM fiscal_periods WHERE company_id = $1 AND is_deleted = FALSE
       ORDER BY period_start ${safeSortOrder} LIMIT $2 OFFSET $3`,
      [companyId, limit, offset],
    ),
    query(`SELECT COUNT(*) FROM fiscal_periods WHERE company_id = $1 AND is_deleted = FALSE`, [companyId]),
  ]);
  return { rows: data.rows, totalRecords: parseInt(count.rows[0].count, 10) };
}

async function findById(companyId, id) {
  const { rows } = await query(
    `SELECT * FROM fiscal_periods WHERE id = $1 AND company_id = $2 AND is_deleted = FALSE`,
    [id, companyId],
  );
  return rows[0] || null;
}

async function findOverlapping(companyId, periodStart, periodEnd) {
  const { rows } = await query(
    `SELECT * FROM fiscal_periods
     WHERE company_id = $1 AND is_deleted = FALSE AND period_start <= $3 AND period_end >= $2`,
    [companyId, periodStart, periodEnd],
  );
  return rows;
}

/** Most specific period covering a date, if any — used to gate new postings. */
async function findCoveringDate(companyId, date) {
  const { rows } = await query(
    `SELECT * FROM fiscal_periods
     WHERE company_id = $1 AND is_deleted = FALSE AND period_start <= $2 AND period_end >= $2
     ORDER BY created_at DESC LIMIT 1`,
    [companyId, date],
  );
  return rows[0] || null;
}

async function create(companyId, { periodStart, periodEnd }, createdBy) {
  const { rows } = await query(
    `INSERT INTO fiscal_periods (company_id, period_start, period_end, created_by, updated_by)
     VALUES ($1, $2, $3, $4, $4)
     RETURNING *`,
    [companyId, periodStart, periodEnd, createdBy],
  );
  return rows[0];
}

async function close(companyId, id, closedBy) {
  const { rows } = await query(
    `UPDATE fiscal_periods
     SET status = 'closed', closed_by = $3, closed_at = now(), updated_by = $3, updated_at = now()
     WHERE id = $1 AND company_id = $2 AND is_deleted = FALSE AND status = 'open'
     RETURNING *`,
    [id, companyId, closedBy],
  );
  return rows[0] || null;
}

module.exports = { list, findById, findOverlapping, findCoveringDate, create, close };
