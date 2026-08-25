const { query } = require('../config/db');

/**
 * All GST report aggregations read off finance_transactions joined to its
 * finance_transaction_tax_details companion row — the structured tax source
 * populated by finance.service.js#quickEntry / #recordExpense. Sale rows are
 * ledger credits, purchase/expense rows are ledger debits.
 */
function dateConditions(columnPrefix, { from, to }, params) {
  const conditions = [];
  if (from) {
    params.push(from);
    conditions.push(`${columnPrefix}transaction_date >= $${params.length}`);
  }
  if (to) {
    params.push(to);
    conditions.push(`${columnPrefix}transaction_date <= $${params.length}`);
  }
  return conditions;
}

/** Outward supplies (sales): HSN-wise and rate-wise summary, split B2B/B2C. */
async function getOutwardSummary(companyId, period) {
  const params = [companyId];
  const conditions = ['tx.company_id = $1', 'tx.is_deleted = FALSE', "tx.direction = 'credit'", 'td.is_gst_applicable = TRUE'];
  conditions.push(...dateConditions('tx.', period, params));

  const { rows } = await query(
    `SELECT td.hsn_code, td.gst_rate, td.party_type,
            COUNT(*) AS invoice_count,
            COALESCE(SUM(td.taxable_value), 0) AS taxable_value,
            COALESCE(SUM(td.cgst_amount), 0) AS cgst_amount,
            COALESCE(SUM(td.sgst_amount), 0) AS sgst_amount,
            COALESCE(SUM(td.igst_amount), 0) AS igst_amount
     FROM finance_transactions tx
     JOIN finance_transaction_tax_details td ON td.finance_transaction_id = tx.id AND td.is_deleted = FALSE
     WHERE ${conditions.join(' AND ')}
     GROUP BY td.hsn_code, td.gst_rate, td.party_type
     ORDER BY td.hsn_code NULLS LAST, td.gst_rate`,
    params,
  );
  return rows;
}

/** B2B invoice-wise rows (GSTR-1 B2B section needs per-invoice buyer GSTIN). */
async function getB2bInvoices(companyId, period) {
  const params = [companyId];
  const conditions = [
    'tx.company_id = $1',
    'tx.is_deleted = FALSE',
    "tx.direction = 'credit'",
    'td.is_gst_applicable = TRUE',
    "td.party_type = 'b2b'",
  ];
  conditions.push(...dateConditions('tx.', period, params));

  const { rows } = await query(
    `SELECT tx.id AS transaction_id, tx.transaction_date, tx.party_name, td.party_gstin, td.hsn_code,
            td.gst_rate, td.taxable_value, td.cgst_amount, td.sgst_amount, td.igst_amount,
            (td.taxable_value + td.cgst_amount + td.sgst_amount + td.igst_amount) AS invoice_value
     FROM finance_transactions tx
     JOIN finance_transaction_tax_details td ON td.finance_transaction_id = tx.id AND td.is_deleted = FALSE
     WHERE ${conditions.join(' AND ')}
     ORDER BY tx.transaction_date`,
    params,
  );
  return rows;
}

/** Inward supplies (purchases/expenses): eligible-ITC-proxy rows — NOT the GSTN-reconciled 2B. */
async function getInwardSummary(companyId, period) {
  const params = [companyId];
  const conditions = ['tx.company_id = $1', 'tx.is_deleted = FALSE', "tx.direction = 'debit'", 'td.is_gst_applicable = TRUE'];
  conditions.push(...dateConditions('tx.', period, params));

  const { rows } = await query(
    `SELECT tx.id AS transaction_id, tx.transaction_date, tx.party_name, td.party_gstin, td.party_type, td.hsn_code,
            td.gst_rate, td.taxable_value, td.cgst_amount, td.sgst_amount, td.igst_amount
     FROM finance_transactions tx
     JOIN finance_transaction_tax_details td ON td.finance_transaction_id = tx.id AND td.is_deleted = FALSE
     WHERE ${conditions.join(' AND ')}
     ORDER BY tx.transaction_date`,
    params,
  );
  return rows;
}

/**
 * Category-wise credit/debit totals for the P&L report. GST-applicable rows are
 * netted down to their taxable value — the GST portion is recoverable as ITC (for
 * purchases) or collected on behalf of the government (for sales), so it is never
 * part of real business income/expense and must not inflate Total Sales/Expenses.
 */
async function getCategoryTotals(companyId, period) {
  const params = [companyId];
  const conditions = ['tx.company_id = $1', 'tx.is_deleted = FALSE'];
  conditions.push(...dateConditions('tx.', period, params));

  const { rows } = await query(
    `SELECT COALESCE(tx.category, 'uncategorized') AS category, tx.direction,
            COALESCE(SUM(
              -- Only net down when a real taxable_value has actually been entered —
              -- rows still pending invoice details (taxable_value = 0) fall back to
              -- the full amount rather than silently understating the expense to ₹0.
              CASE WHEN td.is_gst_applicable AND td.taxable_value > 0 THEN td.taxable_value ELSE tx.amount END
            ), 0) AS total
     FROM finance_transactions tx
     LEFT JOIN finance_transaction_tax_details td ON td.finance_transaction_id = tx.id AND td.is_deleted = FALSE
     -- Capital expenditure (a purchase that became a Fixed Asset) is excluded here —
     -- its full cost is not a period expense, only its depreciation is (added
     -- separately by gstReport.service.js#getProfitAndLoss as a 'Depreciation' line).
     LEFT JOIN fixed_assets fa ON fa.finance_transaction_id = tx.id AND fa.is_deleted = FALSE
     WHERE fa.id IS NULL AND ${conditions.join(' AND ')}
     GROUP BY tx.category, tx.direction
     ORDER BY tx.category`,
    params,
  );
  return rows;
}

module.exports = { getOutwardSummary, getB2bInvoices, getInwardSummary, getCategoryTotals };
