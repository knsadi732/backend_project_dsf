const AppError = require('../utils/AppError');
const { withTransaction } = require('../config/db');
const { buildPaginationMeta } = require('../utils/pagination');
const payableRepository = require('../repositories/payable.repository');
const payablePaymentRepository = require('../repositories/payablePayment.repository');
const financeTransactionRepository = require('../repositories/financeTransaction.repository');

async function generatePayableNumber() {
  return payableRepository.peekPayableNumber();
}

/**
 * A payable is a due amount owed to any party outside the PO/GRN flow
 * (see vendor_bills for that case) — e.g. a rent deposit owed to a landlord
 * that isn't paid up front. No finance_transaction is posted at creation
 * since no cash has moved yet; only recordPayment posts one, once money
 * actually changes hands.
 */
async function createPayable(companyId, { branchId, payableNumber, partyName, purpose, totalAmount, dueDate, remarks }, actorId) {
  return withTransaction((client) =>
    payableRepository.create(client, companyId, { branchId, payableNumber, partyName, purpose, totalAmount, dueDate, remarks }, actorId),
  );
}

async function getPayable(companyId, id) {
  const payable = await payableRepository.findById(companyId, id);
  if (!payable) throw new AppError('PAYABLE_001');
  return payable;
}

async function listPayables(companyId, pagination, filters) {
  const { rows, totalRecords } = await payableRepository.list(companyId, pagination, filters);
  return { rows, meta: buildPaginationMeta({ page: pagination.page, limit: pagination.limit, totalRecords }) };
}

/**
 * Records a (possibly partial) payment against a payable's due balance —
 * e.g. a month's rent adjusted against a rent deposit due. Posts a debit
 * finance_transaction so it flows into the existing ledger automatically
 * (mirrors loan.service.js recordRepayment). Auto-closes to 'paid' once the
 * due balance hits zero.
 */
async function recordPayment(companyId, payableId, { amount, paidAt, remarks }, actorId) {
  return withTransaction(
    async (client) => {
      const payable = await payableRepository.findByIdForUpdate(client, companyId, payableId);
      if (!payable) throw new AppError('PAYABLE_001');
      if (payable.status !== 'pending' && payable.status !== 'partial') throw new AppError('PAYABLE_002');

      const newAmountPaid = Number(payable.amount_paid) + Number(amount);
      if (newAmountPaid > Number(payable.total_amount)) throw new AppError('PAYABLE_002', [], 'Payment exceeds the outstanding due.');

      const status = newAmountPaid >= Number(payable.total_amount) ? 'paid' : 'partial';
      const updated = await payableRepository.recordPayment(client, payableId, payable.version, { amountPaid: newAmountPaid, status }, actorId);
      if (!updated) throw new AppError('PAYABLE_002', [], 'Payable was modified concurrently — retry.');

      const payment = await payablePaymentRepository.create(client, companyId, { payableId, amount, paidAt, remarks }, actorId);

      await financeTransactionRepository.create(
        client,
        companyId,
        {
          branchId: payable.branch_id,
          transactionDate: paidAt || new Date(),
          referenceType: 'payable_payment',
          referenceId: payable.id,
          direction: 'debit',
          amount,
          description: `Payable payment — ${payable.payable_number} (${payable.purpose})`,
        },
        actorId,
      );

      return { ...payment, outstandingBalance: Number(payable.total_amount) - newAmountPaid };
    },
    { isolationLevel: 'REPEATABLE READ' },
  );
}

async function listPayments(companyId, payableId, pagination) {
  const { rows, totalRecords } = await payablePaymentRepository.list(companyId, pagination, { payableId });
  return { rows, meta: buildPaginationMeta({ page: pagination.page, limit: pagination.limit, totalRecords }) };
}

/** Manual terminal state for a payable that will never be paid (e.g. waived by the party). */
async function writeOffPayable(companyId, payableId, actorId) {
  return withTransaction(async (client) => {
    const payable = await payableRepository.findByIdForUpdate(client, companyId, payableId);
    if (!payable) throw new AppError('PAYABLE_001');
    if (payable.status !== 'pending' && payable.status !== 'partial') throw new AppError('PAYABLE_002');
    const updated = await payableRepository.updateStatus(client, payableId, payable.version, 'written_off', actorId);
    if (!updated) throw new AppError('PAYABLE_002', [], 'Payable was modified concurrently — retry.');
    return updated;
  });
}

module.exports = {
  generatePayableNumber,
  createPayable,
  getPayable,
  listPayables,
  recordPayment,
  listPayments,
  writeOffPayable,
};
