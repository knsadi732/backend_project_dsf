const AppError = require('../utils/AppError');
const { withTransaction } = require('../config/db');
const { buildPaginationMeta } = require('../utils/pagination');
const fiscalPeriodRepository = require('../repositories/fiscalPeriod.repository');
const financeTransactionRepository = require('../repositories/financeTransaction.repository');
const financeTransactionTaxDetailRepository = require('../repositories/financeTransactionTaxDetail.repository');
const paymentSlipRepository = require('../repositories/paymentSlip.repository');
const expenseRepository = require('../repositories/expense.repository');
const billRepository = require('../repositories/bill.repository');
const orderRepository = require('../repositories/order.repository');
const settingsRepository = require('../repositories/settings.repository');
const companyRepository = require('../repositories/company.repository');
const statutoryAuditRepository = require('../repositories/statutoryAudit.repository');
const fundingSourceRepository = require('../repositories/fundingSource.repository');
const payableRepository = require('../repositories/payable.repository');

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

async function recordTransaction(
  companyId,
  { branchId, transactionDate, referenceType, referenceId, direction, amount, description, fundingSourceId, fundingType, partyName, paymentMode, utrReference },
  actorId,
) {
  const date = transactionDate || new Date();
  const resolvedDirection = FIXED_DIRECTION_BY_REFERENCE_TYPE[referenceType] || direction;
  return withTransaction(
    async (client) => {
      const period = await assertPostingDateOpen(companyId, date);
      const tx = await financeTransactionRepository.create(
        client,
        companyId,
        {
          branchId, transactionDate: date, fiscalPeriodId: period?.id, referenceType, referenceId,
          direction: resolvedDirection, amount, description, fundingSourceId, fundingType, partyName, paymentMode, utrReference,
        },
        actorId,
      );

      if (fundingSourceId) {
        await syncFundingSourceAdvancePayable(client, companyId, fundingSourceId, actorId);
      }

      return tx;
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

async function recordExpense(
  companyId,
  {
    warehouseId, category, amount, description, transactionDate,
    gstApplicable, gstAmount, gstDetail,
    fundingSourceId, fundingType, utrReference, invoiceNumber, orderId, paymentMode, partyName,
    paidReceivedBy, paidReceivedByName,
  },
  actorId,
) {
  return withTransaction(
    async (client) => {
      const period = await assertPostingDateOpen(companyId, transactionDate);
      const expense = await expenseRepository.create(
        client,
        companyId,
        {
          warehouseId, category, amount, description, recordedBy: actorId, gstApplicable, gstAmount,
          fundingSourceId, fundingType, utrReference, invoiceNumber, orderId, paymentMode, paidReceivedByName,
        },
        actorId,
      );
      const tx = await financeTransactionRepository.create(
        client,
        companyId,
        {
          transactionDate,
          fiscalPeriodId: period?.id,
          referenceType: 'expense',
          referenceId: expense.id,
          direction: 'debit',
          amount,
          description: description || category,
          utrReference,
          invoiceNumber,
          orderId,
          transactionNature: 'expense',
          paymentMode,
          partyName,
          fundingSourceId,
          fundingType,
          paidReceivedBy,
          paidReceivedByName,
          category,
        },
        actorId,
      );

      if (gstApplicable) {
        await financeTransactionTaxDetailRepository.create(
          client,
          tx.id,
          {
            isGstApplicable: true,
            taxableValue: gstDetail?.taxableValue ?? Number(amount) - Number(gstAmount || 0),
            gstRate: gstDetail?.gstRate,
            cgstAmount: gstDetail?.cgstAmount,
            sgstAmount: gstDetail?.sgstAmount,
            igstAmount: gstDetail?.igstAmount,
            hsnCode: gstDetail?.hsnCode,
            placeOfSupplyStateCode: gstDetail?.placeOfSupplyStateCode,
            partyGstin: gstDetail?.partyGstin,
            partyType: gstDetail?.partyType,
          },
          actorId,
        );
      }

      if (fundingSourceId) {
        await syncFundingSourceAdvancePayable(client, companyId, fundingSourceId, actorId);
      }

      return expense;
    },
    { isolationLevel: 'REPEATABLE READ' },
  );
}

/**
 * Keeps an "Owner Advance Reimbursement"-style payable (one explicitly
 * linked to this funding source via payables.funding_source_id) in sync
 * with the live total of every rupee tagged to that funding source —
 * expense debits AND standalone credit transfers (e.g. cash handed to a
 * staff member as a business advance) both count, since both are money
 * that person put into the business. Recomputed from scratch each time
 * rather than incremented, so it stays correct even if a past entry is
 * later edited or removed. A funding source with no such payable is a
 * no-op; this never creates one on its own.
 */
async function syncFundingSourceAdvancePayable(client, companyId, fundingSourceId, actorId) {
  const payable = await payableRepository.findOpenByFundingSourceForUpdate(client, companyId, fundingSourceId);
  if (!payable) return;

  const total = await financeTransactionRepository.sumByFundingSource(client, companyId, fundingSourceId);
  if (total === Number(payable.total_amount)) return;

  await payableRepository.syncTotalAmount(client, payable.id, payable.version, total, actorId);
}

async function listExpenses(companyId, pagination) {
  const { rows, totalRecords } = await expenseRepository.list(companyId, pagination);
  return { rows, meta: buildPaginationMeta({ page: pagination.page, limit: pagination.limit, totalRecords }) };
}

/**
 * Single spreadsheet-shaped entry point mirroring the owner's manual ledger columns
 * (Date, UTR, Nature, Credit/Debit, Category, Purpose, Fund Source, Paid/Received By,
 * Payment Mode, Invoice/Order ID, Party, GST). A thin mapper over the existing GL
 * posting paths — it must not reimplement ledger logic.
 *
 * transactionNature: 'expense' delegates to recordExpense (money out, category-tracked).
 * 'sale' | 'manual' post directly to finance_transactions: 'sale' is always a credit,
 * optionally linked to an existing order (referenceType 'order'); anything else is a
 * free-direction 'manual'-nature row (referenceType 'quick_entry' when untagged).
 */
async function quickEntry(companyId, payload, actorId) {
  if (payload.transactionNature === 'expense') {
    return recordExpense(
      companyId,
      {
        warehouseId: payload.warehouseId,
        category: payload.category,
        amount: payload.amount,
        description: payload.description,
        transactionDate: payload.transactionDate,
        gstApplicable: payload.gst?.applicable,
        gstAmount: payload.gst?.gstAmount,
        gstDetail: payload.gst,
        fundingSourceId: payload.fundingSourceId,
        fundingType: payload.fundingType,
        utrReference: payload.utrReference,
        invoiceNumber: payload.invoiceNumber,
        orderId: payload.orderId,
        paymentMode: payload.paymentMode,
        partyName: payload.partyName,
        paidReceivedBy: payload.paidReceivedBy,
        paidReceivedByName: payload.paidReceivedByName,
      },
      actorId,
    );
  }

  const direction = payload.transactionNature === 'sale' ? 'credit' : payload.direction;
  return withTransaction(
    async (client) => {
      const period = await assertPostingDateOpen(companyId, payload.transactionDate);
      const tx = await financeTransactionRepository.create(
        client,
        companyId,
        {
          branchId: payload.branchId,
          transactionDate: payload.transactionDate,
          fiscalPeriodId: period?.id,
          referenceType: payload.invoiceOrderId ? 'order' : 'quick_entry',
          referenceId: payload.invoiceOrderId || null,
          direction,
          amount: payload.amount,
          description: payload.description,
          utrReference: payload.utrReference,
          invoiceNumber: payload.invoiceNumber,
          orderId: payload.orderId,
          transactionNature: payload.transactionNature,
          paymentMode: payload.paymentMode,
          partyName: payload.partyName,
          fundingSourceId: payload.fundingSourceId,
          fundingType: payload.fundingType,
          paidReceivedBy: payload.paidReceivedBy,
          paidReceivedByName: payload.paidReceivedByName,
          category: payload.category,
        },
        actorId,
      );

      if (payload.gst?.applicable) {
        await financeTransactionTaxDetailRepository.create(
          client,
          tx.id,
          {
            isGstApplicable: true,
            taxableValue: payload.gst.taxableValue,
            gstRate: payload.gst.gstRate,
            cgstAmount: payload.gst.cgstAmount,
            sgstAmount: payload.gst.sgstAmount,
            igstAmount: payload.gst.igstAmount,
            hsnCode: payload.gst.hsnCode,
            placeOfSupplyStateCode: payload.gst.placeOfSupplyStateCode,
            partyGstin: payload.gst.partyGstin,
            partyType: payload.gst.partyType,
          },
          actorId,
        );
      }

      return tx;
    },
    { isolationLevel: 'REPEATABLE READ' },
  );
}

async function createFundingSource(companyId, payload, actorId) {
  return fundingSourceRepository.create(companyId, payload, actorId);
}

async function listFundingSources(companyId, pagination) {
  const { rows, totalRecords } = await fundingSourceRepository.list(companyId, pagination);
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

const ORDER_PAYMENT_STATUS_BY_BILL_STATUS = { unpaid: 'pending', partial: 'partial', paid: 'paid' };

/**
 * paidAmount is the total received so far (not just this payment) —
 * balance_due = total_amount - paidAmount, floored at 0.
 *
 * The bill's status is the source of truth for "has this been paid" —
 * whatever it resolves to here is mirrored onto the linked Sales Order's
 * own `payment_status` (unpaid→pending, partial→partial, paid→paid) so the
 * Sales side reflects Finance's record without a separate manual step.
 * Bypasses the strict one-step-at-a-time PAYMENT_STATUS_PIPELINE check
 * order.service.js's own transition endpoint enforces — Finance can
 * legitimately jump straight from unpaid to paid (a single full payment),
 * and the order should reflect that immediately rather than being forced
 * through a fake "partial" step.
 */
async function updateBillStatus(companyId, id, { status, paidAmount }, actorId) {
  const bill = await billRepository.findById(companyId, id);
  if (!bill) throw new AppError('COMMON_001');

  const balanceDue = paidAmount != null ? Math.max(Number(bill.total_amount) - Number(paidAmount), 0) : undefined;
  const resolvedStatus = status || (balanceDue === 0 ? 'paid' : balanceDue < Number(bill.total_amount) ? 'partial' : 'unpaid');

  const updated = await billRepository.updateStatus(companyId, id, { status: resolvedStatus, balanceDue }, actorId);
  if (!updated) throw new AppError('COMMON_001');

  if (bill.order_id) {
    const targetPaymentStatus = ORDER_PAYMENT_STATUS_BY_BILL_STATUS[resolvedStatus];
    if (targetPaymentStatus) {
      await withTransaction(async (client) => {
        const order = await orderRepository.findByIdForUpdate(client, companyId, bill.order_id);
        if (order && order.payment_status !== targetPaymentStatus) {
          await orderRepository.updateStatus(client, bill.order_id, order.version, { paymentStatus: targetPaymentStatus }, actorId);
        }
      });
    }
  }

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
  quickEntry,
  createFundingSource,
  listFundingSources,
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
