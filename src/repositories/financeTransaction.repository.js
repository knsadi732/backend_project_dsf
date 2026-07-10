const { query } = require('../config/db');
const { buildListQuery } = require('../utils/queryBuilder');

async function create(client, companyId, fields, createdBy) {
  const { rows } = await client.query(
    `INSERT INTO finance_transactions (company_id, branch_id, fiscal_period_id, reference_type, reference_id,
                                        direction, amount, description, created_by, updated_by)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $9)
     RETURNING *`,
    [
      companyId,
      fields.branchId || null,
      fields.fiscalPeriodId || null,
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

async function list(companyId, pagination, { referenceType } = {}) {
  const extraConditions = [];
  const extraParams = [];
  if (referenceType) {
    extraConditions.push(`reference_type = $${extraParams.length + 2}`);
    extraParams.push(referenceType);
  }

  const { dataSql, dataParams, countSql, countParams } = buildListQuery({
    table: 'finance_transactions',
    companyId,
    pagination,
    searchableColumns: ['description'],
    extraConditions,
    extraParams,
  });
  const [data, count] = await Promise.all([query(dataSql, dataParams), query(countSql, countParams)]);
  return { rows: data.rows, totalRecords: parseInt(count.rows[0].count, 10) };
}

/** CA scope: ledger summary — total debits/credits within a date range. */
async function summarize(companyId, { from, to } = {}) {
  const conditions = ['company_id = $1', 'is_deleted = FALSE'];
  const params = [companyId];
  if (from) {
    conditions.push(`created_at >= $${params.length + 1}`);
    params.push(from);
  }
  if (to) {
    conditions.push(`created_at <= $${params.length + 1}`);
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
