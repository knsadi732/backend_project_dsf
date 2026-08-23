const { query, withTransaction } = require('../config/db');

function monthStartOf(date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

/**
 * overhead_cost_per_unit = total overhead this month / total units produced
 * this month. "Overhead this month" = every finance_transaction posted this
 * month with reference_type 'loan_interest' or 'fixed_expense' (i.e. what
 * recurringCharges.job.js posts — loan interest, room rent, etc.).
 * "Produced this month" = quantity on every work order whose stage reached
 * "completed" this month. Recomputed (not incrementally patched) every time
 * either side of the ratio could have changed — a new charge posts, or a
 * work order completes — so it stays consistent with both inputs; cheap
 * enough for the volumes this system handles.
 */
async function reallocateOverheadForMonth(client, companyId, monthStart) {
  const monthEnd = new Date(monthStart);
  monthEnd.setMonth(monthEnd.getMonth() + 1);

  const runner = client ?? { query };

  const overheadResult = await runner.query(
    `SELECT COALESCE(SUM(amount), 0) AS total
     FROM finance_transactions
     WHERE company_id = $1 AND is_deleted = FALSE
       AND reference_type IN ('loan_interest', 'recurring_charge')
       AND transaction_date >= $2 AND transaction_date < $3`,
    [companyId, monthStart, monthEnd],
  );
  const totalOverhead = Number(overheadResult.rows[0].total);

  const productionResult = await runner.query(
    `SELECT id, quantity FROM work_orders
     WHERE company_id = $1 AND is_deleted = FALSE AND stage = 'completed'
       AND updated_at >= $2 AND updated_at < $3`,
    [companyId, monthStart, monthEnd],
  );
  const totalProduction = productionResult.rows.reduce((sum, row) => sum + Number(row.quantity), 0);

  if (totalProduction <= 0) return { totalOverhead, totalProduction, overheadPerUnit: 0, workOrdersUpdated: 0 };

  const overheadPerUnit = totalOverhead / totalProduction;

  for (const row of productionResult.rows) {
    await runner.query(`UPDATE work_orders SET overhead_cost = $2, updated_at = updated_at WHERE id = $1`, [
      row.id,
      overheadPerUnit * Number(row.quantity),
    ]);
  }

  return { totalOverhead, totalProduction, overheadPerUnit, workOrdersUpdated: productionResult.rows.length };
}

/** Runs the reallocation for every company that has at least one completed work order or posted overhead charge this month. */
async function reallocateOverheadForAllCompanies(monthStart) {
  const { rows } = await query(`SELECT id FROM companies WHERE is_deleted = FALSE`);
  const results = [];
  for (const company of rows) {
    const result = await withTransaction((client) => reallocateOverheadForMonth(client, company.id, monthStart));
    results.push({ companyId: company.id, ...result });
  }
  return results;
}

module.exports = { reallocateOverheadForMonth, reallocateOverheadForAllCompanies, monthStartOf };
