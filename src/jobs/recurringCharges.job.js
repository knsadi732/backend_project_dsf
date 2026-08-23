const { withTransaction } = require('../config/db');
const recurringChargeRepository = require('../repositories/recurringCharge.repository');
const financeTransactionRepository = require('../repositories/financeTransaction.repository');
const expenseRepository = require('../repositories/expense.repository');
const { reallocateOverheadForMonth, monthStartOf } = require('../services/overheadAllocation.service');
const logger = require('../utils/logger');

/**
 * Runs daily; posts whatever recurring charge (loan interest, room rent,
 * etc.) is due today across every company. `charge.day_of_month` is the
 * trigger, `last_posted_month` is the once-per-month guard. Loan interest is
 * computed here (flat: principal × rate/100/12; reducing: outstanding
 * balance × rate/100/12) rather than stored, since the outstanding balance
 * moves every time a repayment lands. Fixed expenses (e.g. rent) post their
 * stored `fixed_amount` as-is and also land in the regular `expenses` table
 * so they show up in the normal Expenses ledger, not just as a raw
 * transaction. Every posting immediately re-triggers this month's
 * overhead-cost reallocation (overheadAllocation.service.js) for that
 * company, since a new charge changes the "total overhead" side of the
 * per-unit-overhead ratio.
 */
async function runRecurringCharges(referenceDate = new Date()) {
  const today = referenceDate.getDate();
  const monthStart = monthStartOf(referenceDate);
  const due = await recurringChargeRepository.findDueToday(today, monthStart);

  let posted = 0;
  for (const charge of due) {
    await withTransaction(async (client) => {
      if (charge.charge_type === 'loan_interest') {
        // Outstanding balance = principal - repaid principal, same derivation
        // loan.service.js getLoan uses — read fresh here rather than trusting
        // any cached figure, since repayments could have landed since.
        const { rows } = await client.query(
          `SELECT COALESCE(SUM(principal_component), 0) AS repaid FROM loan_repayments WHERE loan_id = $1 AND is_deleted = FALSE`,
          [charge.loan_id],
        );
        const outstanding = Math.max(Number(charge.principal_amount) - Number(rows[0].repaid), 0);
        // loans.interest_rate is a MONTHLY percentage in this system (e.g.
        // 3 means 3%/month, not 3%/year) — no /12 here.
        const base = charge.interest_type === 'reducing' ? outstanding : Number(charge.principal_amount);
        const interestAmount = Math.round(((base * Number(charge.interest_rate)) / 100) * 100) / 100;
        if (interestAmount <= 0) return;

        await financeTransactionRepository.create(
          client,
          charge.company_id,
          {
            branchId: charge.branch_id,
            transactionDate: referenceDate,
            referenceType: 'loan_interest',
            referenceId: charge.loan_id,
            direction: 'debit',
            amount: interestAmount,
            description: `Monthly interest — ${charge.loan_number} (${charge.description})`,
          },
          null,
        );
      } else {
        const amount = Number(charge.fixed_amount);
        if (!(amount > 0)) return;

        const expense = await expenseRepository.create(
          client,
          charge.company_id,
          { warehouseId: null, category: charge.category || charge.description, amount, description: charge.description, recordedBy: null },
          null,
        );
        await financeTransactionRepository.create(
          client,
          charge.company_id,
          {
            branchId: charge.branch_id,
            transactionDate: referenceDate,
            referenceType: 'recurring_charge',
            referenceId: charge.id,
            direction: 'debit',
            amount,
            description: charge.description,
          },
          null,
        );
        void expense;
      }

      await recurringChargeRepository.markPosted(client, charge.id, monthStart);
      await reallocateOverheadForMonth(client, charge.company_id, monthStart);
      posted += 1;
    });
  }

  logger.info(`Recurring charges: posted ${posted} of ${due.length} due today.`);
  return { due: due.length, posted };
}

module.exports = runRecurringCharges;
