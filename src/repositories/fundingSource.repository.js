const { query } = require('../config/db');

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

/**
 * Lists funding sources with their outstanding balance — the sum of every
 * finance_transactions row tagged with this funding source, i.e. what the business
 * still owes the party (an advance/loan is only reduced by an explicit repayment
 * transaction, none of which exist yet for informal owner advances).
 */
async function list(companyId, pagination) {
  const conditions = ['fs.company_id = $1', 'fs.is_deleted = FALSE'];
  const params = [companyId];
  if (pagination.search) {
    params.push(`%${pagination.search}%`);
    conditions.push(`(fs.party_name ILIKE $${params.length} OR fs.contact_info ILIKE $${params.length})`);
  }
  const whereClause = `WHERE ${conditions.join(' AND ')}`;

  const dataSql = `
    SELECT fs.*,
           COALESCE(bal.entry_count, 0) AS entry_count,
           COALESCE(bal.total_funded, 0) AS total_funded
    FROM funding_sources fs
    LEFT JOIN (
      SELECT funding_source_id, COUNT(*) AS entry_count, SUM(amount) AS total_funded
      FROM finance_transactions
      WHERE company_id = $1 AND is_deleted = FALSE AND funding_source_id IS NOT NULL
      GROUP BY funding_source_id
    ) bal ON bal.funding_source_id = fs.id
    ${whereClause}
    ORDER BY fs.created_at DESC
    LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
  const countSql = `SELECT COUNT(*) FROM funding_sources fs ${whereClause}`;

  const [data, count] = await Promise.all([
    query(dataSql, [...params, pagination.limit, pagination.offset]),
    query(countSql, params),
  ]);
  return { rows: data.rows, totalRecords: parseInt(count.rows[0].count, 10) };
}

module.exports = { create, findById, list };
