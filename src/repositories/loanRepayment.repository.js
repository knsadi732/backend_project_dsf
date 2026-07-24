const { query } = require('../config/db');
const { buildListQuery } = require('../utils/queryBuilder');

async function create(client, companyId, { loanId, amount, principalComponent, interestComponent, paidAt, remarks }, createdBy) {
  const { rows } = await client.query(
    `INSERT INTO loan_repayments (company_id, loan_id, amount, principal_component, interest_component, paid_at, remarks, created_by, updated_by)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $8)
     RETURNING *`,
    [companyId, loanId, amount, principalComponent, interestComponent || 0, paidAt || new Date(), remarks || null, createdBy],
  );
  return rows[0];
}

async function list(companyId, pagination, { loanId } = {}) {
  const extraConditions = [];
  const extraParams = [];
  if (loanId) {
    extraConditions.push(`loan_id = $${extraParams.length + 2}`);
    extraParams.push(loanId);
  }

  const { dataSql, dataParams, countSql, countParams } = buildListQuery({
    table: 'loan_repayments',
    companyId,
    pagination,
    searchableColumns: [],
    extraConditions,
    extraParams,
  });
  const [data, count] = await Promise.all([query(dataSql, dataParams), query(countSql, countParams)]);
  return { rows: data.rows, totalRecords: parseInt(count.rows[0].count, 10) };
}

module.exports = { create, list };
