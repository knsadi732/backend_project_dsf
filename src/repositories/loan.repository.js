const { query } = require('../config/db');
const { buildListQuery } = require('../utils/queryBuilder');

/** Reserves and returns the next loan number, e.g. 'DSF-LN-0001'. Each call consumes the sequence. */
async function generateLoanNumber(runner = query) {
  const { rows } = await runner(
    `SELECT 'DSF-LN-' || LPAD(nextval('loans_ln_seq')::text, 4, '0') AS loan_number`,
  );
  return rows[0].loan_number;
}

/** Previews the next loan number without consuming the sequence — safe to call repeatedly. */
async function peekLoanNumber(runner = query) {
  const { rows } = await runner(
    `SELECT 'DSF-LN-' || LPAD((CASE WHEN is_called THEN last_value + 1 ELSE last_value END)::text, 4, '0') AS loan_number
     FROM loans_ln_seq`,
  );
  return rows[0].loan_number;
}

async function create(
  client,
  companyId,
  { branchId, loanNumber, lenderName, lenderType, principalAmount, interestRate, interestType, startDate, tenureMonths, remarks },
  createdBy,
) {
  const number = loanNumber || (await generateLoanNumber((text, params) => client.query(text, params)));
  const { rows } = await client.query(
    `INSERT INTO loans (
       company_id, branch_id, loan_number, lender_name, lender_type, principal_amount,
       interest_rate, interest_type, start_date, tenure_months, remarks, created_by, updated_by
     )
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $12)
     RETURNING *`,
    [
      companyId,
      branchId || null,
      number,
      lenderName,
      lenderType,
      principalAmount,
      interestRate,
      interestType,
      startDate,
      tenureMonths || null,
      remarks || null,
      createdBy,
    ],
  );
  return rows[0];
}

async function findById(companyId, id) {
  const { rows } = await query(`SELECT * FROM loans WHERE id = $1 AND company_id = $2 AND is_deleted = FALSE`, [id, companyId]);
  return rows[0] || null;
}

async function findByIdForUpdate(client, companyId, id) {
  const { rows } = await client.query(
    `SELECT * FROM loans WHERE id = $1 AND company_id = $2 AND is_deleted = FALSE FOR UPDATE`,
    [id, companyId],
  );
  return rows[0] || null;
}

async function list(companyId, pagination, { status } = {}) {
  const extraConditions = [];
  const extraParams = [];
  if (status) {
    extraConditions.push(`status = $${extraParams.length + 2}`);
    extraParams.push(status);
  }

  const { dataSql, dataParams, countSql, countParams } = buildListQuery({
    table: 'loans',
    companyId,
    pagination,
    searchableColumns: ['loan_number', 'lender_name'],
    extraConditions,
    extraParams,
  });
  const [data, count] = await Promise.all([query(dataSql, dataParams), query(countSql, countParams)]);
  return { rows: data.rows, totalRecords: parseInt(count.rows[0].count, 10) };
}

async function updateStatus(client, id, expectedVersion, status, updatedBy) {
  const { rows } = await client.query(
    `UPDATE loans
     SET status = $3, version = version + 1, updated_by = $4, updated_at = now()
     WHERE id = $1 AND version = $2
     RETURNING *`,
    [id, expectedVersion, status, updatedBy],
  );
  return rows[0] || null;
}

/** Total principal repaid so far — outstanding balance is always derived from this, never stored. */
async function sumRepaidPrincipal(companyId, loanId) {
  const { rows } = await query(
    `SELECT COALESCE(SUM(principal_component), 0) AS total
     FROM loan_repayments WHERE company_id = $1 AND loan_id = $2 AND is_deleted = FALSE`,
    [companyId, loanId],
  );
  return Number(rows[0].total);
}

module.exports = {
  create,
  findById,
  findByIdForUpdate,
  list,
  updateStatus,
  generateLoanNumber,
  peekLoanNumber,
  sumRepaidPrincipal,
};
