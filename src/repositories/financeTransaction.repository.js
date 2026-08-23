const { query } = require('../config/db');

async function create(client, companyId, fields, createdBy) {
  const { rows } = await client.query(
    `INSERT INTO finance_transactions (company_id, branch_id, fiscal_period_id, transaction_date, reference_type,
                                        reference_id, direction, amount, description, utr_reference, invoice_number,
                                        transaction_nature, payment_mode, party_name, funding_source_id,
                                        funding_type, paid_received_by, paid_received_by_name, category, created_by, updated_by)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $20)
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
      fields.utrReference || null,
      fields.invoiceNumber || null,
      fields.transactionNature || null,
      fields.paymentMode || null,
      fields.partyName || null,
      fields.fundingSourceId || null,
      fields.fundingType || null,
      fields.paidReceivedBy || null,
      fields.paidReceivedByName || null,
      fields.category || null,
      createdBy,
    ],
  );
  return rows[0];
}

/** Ledger view: chronological rows with per-row debit/credit split and a running balance. */
async function list(companyId, pagination, { referenceType } = {}) {
  const conditions = ['ft.company_id = $1', 'ft.is_deleted = FALSE'];
  const params = [companyId];

  if (referenceType) {
    params.push(referenceType);
    conditions.push(`ft.reference_type = $${params.length}`);
  }
  if (pagination.search) {
    params.push(`%${pagination.search}%`);
    conditions.push(`ft.description ILIKE $${params.length}`);
  }

  const whereClause = `WHERE ${conditions.join(' AND ')}`;
  const countSql = `SELECT COUNT(*) FROM finance_transactions ft ${whereClause}`;

  params.push(pagination.limit, pagination.offset);
  // Owner Ledger / "expense sheet" view — carries every column the manual
  // spreadsheet had (funding source party name, paid-by user's name)
  // alongside the running balance, so the frontend needs no extra lookups.
  const dataSql = `
    SELECT ft.id AS transaction_id, ft.transaction_date AS date, ft.reference_type AS type, ft.reference_id,
           ft.transaction_nature, ft.description, ft.category, ft.party_name, ft.utr_reference, ft.invoice_number,
           ft.payment_mode,
           -- reference_id only means "order id" when reference_type = 'order'
           -- (it's also an expense/purchase_order/quick_entry id otherwise) —
           -- the join is naturally a no-op (NULL order_number) for those rows.
           o.order_number,
           ft.funding_source_id, fs.party_name AS funding_source_name, ft.funding_type,
           ft.paid_received_by, COALESCE(ft.paid_received_by_name, pu.full_name) AS paid_received_by_name,
           td.is_gst_applicable, td.gst_rate, td.taxable_value,
           td.cgst_amount, td.sgst_amount, td.igst_amount, td.hsn_code,
           (COALESCE(td.cgst_amount, 0) + COALESCE(td.sgst_amount, 0) + COALESCE(td.igst_amount, 0)) AS gst_amount,
           CASE WHEN ft.direction = 'debit' THEN ft.amount ELSE 0 END AS debit,
           CASE WHEN ft.direction = 'credit' THEN ft.amount ELSE 0 END AS credit,
           SUM(CASE WHEN ft.direction = 'credit' THEN ft.amount ELSE -ft.amount END)
             OVER (ORDER BY ft.transaction_date, ft.created_at ROWS UNBOUNDED PRECEDING) AS balance
    FROM finance_transactions ft
    LEFT JOIN funding_sources fs ON fs.id = ft.funding_source_id
    LEFT JOIN users pu ON pu.id = ft.paid_received_by
    LEFT JOIN finance_transaction_tax_details td ON td.finance_transaction_id = ft.id AND td.is_deleted = FALSE
    LEFT JOIN orders o ON o.id = ft.reference_id AND ft.reference_type = 'order'
    ${whereClause}
    ORDER BY ft.transaction_date ASC, ft.created_at ASC
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
