const { query } = require('../config/db');

async function create(client, companyId, fields, createdBy) {
  const { rows } = await client.query(
    `INSERT INTO finance_transactions (company_id, branch_id, fiscal_period_id, transaction_date, reference_type,
                                        reference_id, direction, amount, description, created_by, updated_by)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $10)
     RETURNING *`,
    [
      companyId,
      fields.branchId || null,
      fields.fiscalPeriodId || null,
      fields.transactionDate || new Date(),
      fields.referenceType,
      fields.referenceId || null,
      fields.direction,
      fields.amount,
      fields.description || null,
      createdBy,
    ],
  );
  return rows[0];
}

/** Ledger view: chronological rows with per-row debit/credit split and a running balance. */
async function list(companyId, pagination, { referenceType } = {}) {
  const conditions = ['company_id = $1', 'is_deleted = FALSE'];
  const params = [companyId];

  if (referenceType) {
    params.push(referenceType);
    conditions.push(`reference_type = $${params.length}`);
  }
  if (pagination.search) {
    params.push(`%${pagination.search}%`);
    conditions.push(`description ILIKE $${params.length}`);
  }

  const whereClause = `WHERE ${conditions.join(' AND ')}`;
  const countSql = `SELECT COUNT(*) FROM finance_transactions ${whereClause}`;

  params.push(pagination.limit, pagination.offset);
  const dataSql = `
    SELECT id AS transaction_id, transaction_date AS date, reference_type AS type, description,
           CASE WHEN direction = 'debit' THEN amount ELSE 0 END AS debit,
           CASE WHEN direction = 'credit' THEN amount ELSE 0 END AS credit,
           SUM(CASE WHEN direction = 'credit' THEN amount ELSE -amount END)
             OVER (ORDER BY transaction_date, created_at ROWS UNBOUNDED PRECEDING) AS balance
    FROM finance_transactions
    ${whereClause}
    ORDER BY transaction_date ASC, created_at ASC
    LIMIT $${params.length - 1} OFFSET $${params.length}`;

  const [data, count] = await Promise.all([query(dataSql, params), query(countSql, params.slice(0, -2))]);
  return { rows: data.rows, totalRecords: parseInt(count.rows[0].count, 10) };
}

/** CA scope: ledger summary — total debits/credits within a date range. */
async function summarize(companyId, { from, to } = {}) {
  const conditions = ['company_id = $1', 'is_deleted = FALSE'];
  const params = [companyId];
  if (from) {
    conditions.push(`transaction_date >= $${params.length + 1}`);
    params.push(from);
  }
  if (to) {
    conditions.push(`transaction_date <= $${params.length + 1}`);
    params.push(to);
  }

  const { rows } = await query(
    `SELECT direction, COALESCE(SUM(amount), 0) AS total
     FROM finance_transactions
     WHERE ${conditions.join(' AND ')}
     GROUP BY direction`,
    params,
  );
  return rows;
}

module.exports = { create, list, summarize };
