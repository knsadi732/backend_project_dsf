const AppError = require('../utils/AppError');
const { withTransaction } = require('../config/db');
const { buildPaginationMeta } = require('../utils/pagination');
const loanRepository = require('../repositories/loan.repository');
const loanRepaymentRepository = require('../repositories/loanRepayment.repository');
const financeTransactionRepository = require('../repositories/financeTransaction.repository');

async function generateLoanNumber() {
  return loanRepository.peekLoanNumber();
}

/** Disbursement is posted as a credit finance_transaction so it flows into the existing ledger. */
async function createLoan(
  companyId,
  { branchId, loanNumber, lenderName, lenderType, principalAmount, interestRate, interestType, startDate, tenureMonths, remarks },
  actorId,
) {
  return withTransaction(async (client) => {
    const loan = await loanRepository.create(
      client,
      companyId,
      { branchId, loanNumber, lenderName, lenderType, principalAmount, interestRate, interestType, startDate, tenureMonths, remarks },
      actorId,
    );
    await financeTransactionRepository.create(
      client,
      companyId,
      {
        branchId,
        transactionDate: startDate,
        referenceType: 'loan_disbursement',
        referenceId: loan.id,
        direction: 'credit',
        amount: principalAmount,
        description: `Loan disbursed — ${loan.loan_number} (${lenderName})`,
      },
      actorId,
    );
    return loan;
  });
}

/** outstandingBalance is always derived here — never a stored column (see loans migration). */
async function getLoan(companyId, id) {
  const loan = await loanRepository.findById(companyId, id);
  if (!loan) throw new AppError('LOAN_001');
  const repaidPrincipal = await loanRepository.sumRepaidPrincipal(companyId, id);
  const outstandingBalance = Math.max(Number(loan.principal_amount) - repaidPrincipal, 0);
  return { ...loan, repaidPrincipal, outstandingBalance };
}

async function listLoans(companyId, pagination, filters) {
  const { rows, totalRecords } = await loanRepository.list(companyId, pagination, filters);
  return { rows, meta: buildPaginationMeta({ page: pagination.page, limit: pagination.limit, totalRecords }) };
}

/**
 * Records a repayment against a loan's principal + interest. Every repayment
 * also posts a debit finance_transaction (money out), so it flows into the
 * existing ledger automatically. A loan whose outstanding principal hits zero
 * auto-closes — no separate "mark closed" step needed for a normal payoff.
 */
async function recordRepayment(companyId, loanId, { amount, principalComponent, paidAt, remarks }, actorId) {
  return withTransaction(
    async (client) => {
      const loan = await loanRepository.findByIdForUpdate(client, companyId, loanId);
      if (!loan) throw new AppError('LOAN_001');
      if (loan.status !== 'active') throw new AppError('LOAN_002');

      const interestComponent = Number(amount) - Number(principalComponent);
      const repayment = await loanRepaymentRepository.create(
        client,
        companyId,
        { loanId, amount, principalComponent, interestComponent, paidAt, remarks },
        actorId,
      );

      await financeTransactionRepository.create(
        client,
        companyId,
        {
          branchId: loan.branch_id,
          transactionDate: paidAt,
          referenceType: 'loan_repayment',
          referenceId: loan.id,
          direction: 'debit',
          amount,
          description: `Loan repayment — ${loan.loan_number}`,
        },
        actorId,
      );

      const repaidPrincipal = await loanRepository.sumRepaidPrincipal(companyId, loanId);
      const outstandingBalance = Math.max(Number(loan.principal_amount) - repaidPrincipal, 0);
      if (outstandingBalance <= 0) {
        await loanRepository.updateStatus(client, loanId, loan.version, 'closed', actorId);
      }

      return { ...repayment, outstandingBalance };
    },
    { isolationLevel: 'REPEATABLE READ' },
  );
}

async function listRepayments(companyId, loanId, pagination) {
  const { rows, totalRecords } = await loanRepaymentRepository.list(companyId, pagination, { loanId });
  return { rows, meta: buildPaginationMeta({ page: pagination.page, limit: pagination.limit, totalRecords }) };
}

/** Manual terminal state for a loan that will never be repaid (e.g. settled outside the ledger). */
async function writeOffLoan(companyId, loanId, actorId) {
  return withTransaction(async (client) => {
    const loan = await loanRepository.findByIdForUpdate(client, companyId, loanId);
    if (!loan) throw new AppError('LOAN_001');
    if (loan.status !== 'active') throw new AppError('LOAN_002');
    const updated = await loanRepository.updateStatus(client, loanId, loan.version, 'written_off', actorId);
    if (!updated) throw new AppError('LOAN_002', [], 'Loan was modified concurrently — retry.');
    return updated;
  });
}

module.exports = {
  generateLoanNumber,
  createLoan,
  getLoan,
  listLoans,
  recordRepayment,
  listRepayments,
  writeOffLoan,
};
