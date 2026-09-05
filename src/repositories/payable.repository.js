const { query } = require('../config/db');
const { buildListQuery } = require('../utils/queryBuilder');

/** Previews the next payable number without consuming the sequence — safe to call repeatedly. */
async function peekPayableNumber(runner = query) {
  const { rows } = await runner(
    `SELECT 'DSF-PYB-' || LPAD((CASE WHEN is_called THEN last_value + 1 ELSE last_value END)::text, 4, '0') AS payable_number
     FROM payables_pyb_seq`,
  );
  return rows[0].payable_number;
}

async function generatePayableNumber(runner = query) {
  const { rows } = await runner(
    `SELECT 'DSF-PYB-' || LPAD(nextval('payables_pyb_seq')::text, 4, '0') AS payable_number`,
  );
  return rows[0].payable_number;
}

async function create(
  client,
  companyId,
  { branchId, payableNumber, partyName, purpose, totalAmount, dueDate, remarks },
  createdBy,
) {
  const number = payableNumber || (await generatePayableNumber((text, params) => client.query(text, params)));
  const { rows } = await client.query(
    `INSERT INTO payables (
       company_id, branch_id, payable_number, party_name, purpose, total_amount,
       due_date, remarks, created_by, updated_by
     )
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $9)
     RETURNING *`,
    [companyId, branchId || null, number, partyName, purpose, totalAmount, dueDate || null, remarks || null, createdBy],
  );
  return rows[0];
}

async function findById(companyId, id) {
  const { rows } = await query(`SELECT * FROM payables WHERE id = $1 AND company_id = $2 AND is_deleted = FALSE`, [id, companyId]);
  return rows[0] || null;
}

async function findByIdForUpdate(client, companyId, id) {
  const { rows } = await client.query(
    `SELECT * FROM payables WHERE id = $1 AND company_id = $2 AND is_deleted = FALSE FOR UPDATE`,
    [id, companyId],
  );
  return rows[0] || null;
}

/**
 * The still-open payable (if any) tracking a given funding source's advances
 * — e.g. an "Owner Advance Reimbursement" payable for the owner's funding
 * source. Locked for update since the caller is about to recompute and
 * write its total_amount.
 */
async function findOpenByFundingSourceForUpdate(client, companyId, fundingSourceId) {
  const { rows } = await client.query(
    `SELECT * FROM payables
     WHERE company_id = $1 AND funding_source_id = $2 AND is_deleted = FALSE
       AND status IN ('pending', 'partial')
     FOR UPDATE`,
    [companyId, fundingSourceId],
  );
  return rows[0] || null;
}

/**
 * Recomputes total_amount to the caller-supplied figure (the live sum of
 * advance-funded expense debits) — used to keep an "Owner Advance
 * Reimbursement"-style payable in sync with the ledger instead of it being
 * a one-time manual snapshot. Re-derives status the same way recordPayment
 * does (paid once amount_paid catches up), and takes the version lock like
 * every other payable mutation.
 */
async function syncTotalAmount(client, id, expectedVersion, totalAmount, updatedBy) {
  const { rows } = await client.query(
    `UPDATE payables
     SET total_amount = $3,
         status = CASE WHEN amount_paid >= $3 AND $3 > 0 THEN 'paid' WHEN amount_paid > 0 THEN 'partial' ELSE status END,
         version = version + 1, updated_by = $4, updated_at = now()
     WHERE id = $1 AND version = $2
     RETURNING *`,
    [id, expectedVersion, totalAmount, updatedBy],
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
    table: 'payables',
    companyId,
    pagination,
    searchableColumns: ['payable_number', 'party_name', 'purpose'],
    extraConditions,
    extraParams,
  });
  const [data, count] = await Promise.all([query(dataSql, dataParams), query(countSql, countParams)]);
  return { rows: data.rows, totalRecords: parseInt(count.rows[0].count, 10) };
}

async function recordPayment(client, id, expectedVersion, { amountPaid, status }, updatedBy) {
  const { rows } = await client.query(
    `UPDATE payables
     SET amount_paid = $3, status = $4, version = version + 1, updated_by = $5, updated_at = now()
     WHERE id = $1 AND version = $2
     RETURNING *`,
    [id, expectedVersion, amountPaid, status, updatedBy],
  );
  return rows[0] || null;
}

async function updateStatus(client, id, expectedVersion, status, updatedBy) {
  const { rows } = await client.query(
    `UPDATE payables
     SET status = $3, version = version + 1, updated_by = $4, updated_at = now()
     WHERE id = $1 AND version = $2
     RETURNING *`,
    [id, expectedVersion, status, updatedBy],
  );
  return rows[0] || null;
}

module.exports = {
  generatePayableNumber,
  peekPayableNumber,
  create,
  findById,
  findByIdForUpdate,
  findOpenByFundingSourceForUpdate,
  syncTotalAmount,
  list,
  recordPayment,
  updateStatus,
};
