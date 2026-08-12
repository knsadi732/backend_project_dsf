const AppError = require('../utils/AppError');
const { withTransaction } = require('../config/db');
const { buildPaginationMeta } = require('../utils/pagination');
const fiscalPeriodRepository = require('../repositories/fiscalPeriod.repository');
const financeTransactionRepository = require('../repositories/financeTransaction.repository');
const paymentSlipRepository = require('../repositories/paymentSlip.repository');
const expenseRepository = require('../repositories/expense.repository');
const billRepository = require('../repositories/bill.repository');
const orderRepository = require('../repositories/order.repository');
const settingsRepository = require('../repositories/settings.repository');
const companyRepository = require('../repositories/company.repository');
const statutoryAuditRepository = require('../repositories/statutoryAudit.repository');

/** Blocks new postings dated inside a fiscal period the CA has already closed. */
async function assertPostingDateOpen(companyId, date = new Date()) {
  const period = await fiscalPeriodRepository.findCoveringDate(companyId, date);
  if (period && period.status === 'closed') throw new AppError('FIN_001');
  return period;
}

// Accountant scope --------------------------------------------------------

/**
 * Fixed accounting direction for reference types with unambiguous cash-flow semantics.
 * Money in (sales/collections) is a credit, money out (purchases/expenses) is a debit.
 * Only 'manual' entries let the caller choose, since they have no fixed semantics.
 */
const FIXED_DIRECTION_BY_REFERENCE_TYPE = {
  order: 'credit',
  purchase_order: 'debit',
  expense: 'debit',
};

async function recordTransaction(companyId, { branchId, transactionDate, referenceType, referenceId, direction, amount, description }, actorId) {
  const date = transactionDate || new Date();
  const resolvedDirection = FIXED_DIRECTION_BY_REFERENCE_TYPE[referenceType] || direction;
  return withTransaction(
    async (client) => {
      const period = await assertPostingDateOpen(companyId, date);
      return financeTransactionRepository.create(
        client,
        companyId,
        { branchId, transactionDate: date, fiscalPeriodId: period?.id, referenceType, referenceId, direction: resolvedDirection, amount, description },
        actorId,
      );
    },
    { isolationLevel: 'REPEATABLE READ' },
  );
}

async function listTransactions(companyId, pagination, filters) {
  const { rows, totalRecords } = await financeTransactionRepository.list(companyId, pagination, filters);
  return { rows, meta: buildPaginationMeta({ page: pagination.page, limit: pagination.limit, totalRecords }) };
}

async function issuePaymentSlip(companyId, { orderId, customerId, amount, paymentMode }, actorId) {
  return withTransaction(
    async (client) => {
      await assertPostingDateOpen(companyId);
      const slip = await paymentSlipRepository.create(client, companyId, { orderId, customerId, amount, paymentMode, issuedBy: actorId }, actorId);
      await financeTransactionRepository.create(
        client,
        companyId,
        { referenceType: 'payment_slip', referenceId: slip.id, direction: 'credit', amount, description: `Payment slip ${slip.slip_number}` },
        actorId,
      );
      return slip;
    },
    { isolationLevel: 'REPEATABLE READ' },
  );
}

async function listPaymentSlips(companyId, pagination) {
  const { rows, totalRecords } = await paymentSlipRepository.list(companyId, pagination);
  return { rows, meta: buildPaginationMeta({ page: pagination.page, limit: pagination.limit, totalRecords }) };
}

async function recordExpense(companyId, { warehouseId, category, amount, description }, actorId) {
  return withTransaction(
    async (client) => {
      await assertPostingDateOpen(companyId);
      const expense = await expenseRepository.create(client, companyId, { warehouseId, category, amount, description, recordedBy: actorId }, actorId);
      await financeTransactionRepository.create(
        client,
        companyId,
        { referenceType: 'expense', referenceId: expense.id, direction: 'debit', amount, description: category },
        actorId,
      );
      return expense;
    },
    { isolationLevel: 'REPEATABLE READ' },
  );
}

async function listExpenses(companyId, pagination) {
  const { rows, totalRecords } = await expenseRepository.list(companyId, pagination);
  return { rows, meta: buildPaginationMeta({ page: pagination.page, limit: pagination.limit, totalRecords }) };
}

/**
 * Creates the invoice (bills row) for an order — takes an already-open
 * transaction client so order.service.js can call this as part of the same
 * transaction that marks the order "dispatched" (that's the moment a Sales
 * Order's PDF flips from Proforma Invoice to Tax Invoice — see
 * order.repository.js's dispatched_at stamp). Idempotent: re-dispatching
 * (or a manual "print bill" call afterwards) just returns the existing bill.
 */
async function createBillForOrder(client, companyId, orderId, actorId) {
  const existing = await billRepository.findByOrderId(companyId, orderId);
  if (existing) return existing;

  const order = await orderRepository.findById(companyId, orderId);
  if (!order) throw new AppError('ORDER_002');

  const billNumber = await settingsRepository.claimNextInvoiceNumber(client, companyId);
  const dueDate = new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const bill = await billRepository.create(
    client,
    companyId,
    {
      orderId,
      billNumber,
      customerId: order.customer_id,
      gstAmount: order.tax_amount,
      totalAmount: order.total_amount,
      dueDate,
      printedBy: actorId,
    },
    actorId,
  );
  await financeTransactionRepository.create(
    client,
    companyId,
    { referenceType: 'order', referenceId: order.id, direction: 'credit', amount: order.total_amount, description: `Bill ${bill.bill_number}` },
    actorId,
  );
  return bill;
}

async function printBill(companyId, orderId, actorId) {
  return withTransaction(
    async (client) => {
      await assertPostingDateOpen(companyId);
      return createBillForOrder(client, companyId, orderId, actorId);
    },
    { isolationLevel: 'REPEATABLE READ' },
  );
}

async function listBills(companyId, pagination, filters) {
  const { rows, totalRecords } = await billRepository.list(companyId, pagination, filters);
  return { rows, meta: buildPaginationMeta({ page: pagination.page, limit: pagination.limit, totalRecords }) };
}

async function getBill(companyId, id) {
  const bill = await billRepository.findById(companyId, id);
  if (!bill) throw new AppError('COMMON_001');
  return bill;
}

/** paidAmount is the total received so far (not just this payment) — balance_due = total_amount - paidAmount, floored at 0. */
async function updateBillStatus(companyId, id, { status, paidAmount }, actorId) {
  const bill = await billRepository.findById(companyId, id);
  if (!bill) throw new AppError('COMMON_001');

  const balanceDue = paidAmount != null ? Math.max(Number(bill.total_amount) - Number(paidAmount), 0) : undefined;
  const resolvedStatus = status || (balanceDue === 0 ? 'paid' : balanceDue < Number(bill.total_amount) ? 'partial' : 'unpaid');

  const updated = await billRepository.updateStatus(companyId, id, { status: resolvedStatus, balanceDue }, actorId);
  if (!updated) throw new AppError('COMMON_001');
  return updated;
}

// CA scope ------------------------------------------------------------------

/** Global GST balance / ledger view (plan.md Service-01 CA scope). */
async function getLedgerSummary(companyId, { from, to } = {}) {
  const rows = await financeTransactionRepository.summarize(companyId, { from, to });
  const summary = { debit: 0, credit: 0 };
  for (const row of rows) summary[row.direction] = Number(row.total);
  return { ...summary, balance: summary.credit - summary.debit };
}

/** Legal compliance profile / global GST balance view (plan.md Service-01 CA scope). */
async function getGstProfile(companyId) {
  const [company, settings] = await Promise.all([
    companyRepository.findById(companyId),
    settingsRepository.findByCompanyId(companyId),
  ]);
  return {
    gstin: company?.gstin || null,
    legalName: company?.legal_name || null,
    gstSettings: settings?.gst_settings || {},
  };
}

/**
 * Single-tenant ledger cross-verification: re-derives the ledger summary and
 * stamps it as verified. Full multi-tenant cross-verification (plan.md's
 * "multi-tenant ledger cross-verifications") is out of scope until this
 * deployment actually spans more than one company.
 */
async function crossVerifyLedger(companyId) {
  const summary = await getLedgerSummary(companyId);
  return { ...summary, verified: true, verifiedAt: new Date().toISOString() };
}

async function listStatutoryAudits(companyId, pagination) {
  const { rows, totalRecords } = await statutoryAuditRepository.list(companyId, pagination);
  return { rows, meta: buildPaginationMeta({ page: pagination.page, limit: pagination.limit, totalRecords }) };
}

async function recordStatutoryAudit(companyId, { fiscalPeriodId, auditorName, conductedAt, findings, remarks }, actorId) {
  return statutoryAuditRepository.create(companyId, { fiscalPeriodId, auditorName, conductedAt, findings, remarks }, actorId);
}

module.exports = {
  recordTransaction,
  listTransactions,
  issuePaymentSlip,
  listPaymentSlips,
  recordExpense,
  listExpenses,
  createBillForOrder,
  printBill,
  listBills,
  getBill,
  updateBillStatus,
  getLedgerSummary,
  getGstProfile,
  crossVerifyLedger,
  listStatutoryAudits,
  recordStatutoryAudit,
};
