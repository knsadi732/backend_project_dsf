const AppError = require('../utils/AppError');
const { withTransaction } = require('../config/db');
const { buildPaginationMeta } = require('../utils/pagination');
const vendorBillRepository = require('../repositories/vendorBill.repository');
const vendorRepository = require('../repositories/vendor.repository');
const financeTransactionRepository = require('../repositories/financeTransaction.repository');
const notificationService = require('./notification.service');
const documentService = require('./document.service');
const logger = require('../utils/logger');

/** Resolves the GRN's linked vendor-invoice document into a ready-to-use download URL. */
async function attachInvoiceUrl(companyId, bill) {
  if (!bill.vendor_invoice_document_id) return bill;
  const { url } = await documentService.getDownloadUrl(companyId, bill.vendor_invoice_document_id);
  return { ...bill, invoice_url: url };
}

/**
 * Auto-generates the Vendor Bill (payable) the moment a GRN is created
 * (plan.md Chapter 15: GRN -> Vendor Payment -> Ledger -> Outstanding), giving
 * Finance a single row to track what's owed. Called from within the same
 * transaction as GRN creation, so both commit atomically. Due date is derived
 * from the vendor's configured credit_days.
 */
async function createFromGrn(client, companyId, grn, po, actorId) {
  const vendor = await vendorRepository.findById(companyId, po.vendor_id);
  const creditDays = vendor?.credit_days || 0;
  const paymentDueDate = new Date(Date.now() + creditDays * 24 * 60 * 60 * 1000);

  return vendorBillRepository.create(
    client,
    companyId,
    {
      branchId: po.branch_id,
      warehouseId: po.warehouse_id,
      vendorId: po.vendor_id,
      grnId: grn.id,
      purchaseOrderId: po.id,
      totalAmount: po.total_amount,
      paymentDueDate,
    },
    actorId,
  );
}

async function getVendorBill(companyId, id) {
  const bill = await vendorBillRepository.findById(companyId, id);
  if (!bill) throw new AppError('VB_001');
  return attachInvoiceUrl(companyId, bill);
}

async function listVendorBills(companyId, pagination, filters) {
  const { rows, totalRecords } = await vendorBillRepository.list(companyId, pagination, filters);
  const withUrls = await Promise.all(rows.map((row) => attachInvoiceUrl(companyId, row)));
  return { rows: withUrls, meta: buildPaginationMeta({ page: pagination.page, limit: pagination.limit, totalRecords }) };
}

/**
 * Core payment write, parameterized on an already-open transaction `client`
 * — shared by the standalone endpoint (recordPayment, which opens its own
 * transaction) and approvalRequest.service.js's approve() (which needs this
 * to commit atomically with the approval's own status flip, in the SAME
 * transaction — withTransaction doesn't nest, so it can't just call
 * recordPayment directly).
 */
async function recordPaymentWithClient(client, companyId, id, { amount, utrNumber }, actorId) {
  const existing = await vendorBillRepository.findByIdForUpdate(client, companyId, id);
  if (!existing) throw new AppError('VB_001');

  const newAmountPaid = Number(existing.amount_paid) + Number(amount);
  if (newAmountPaid > Number(existing.total_amount)) throw new AppError('VB_002');

  const status = newAmountPaid >= Number(existing.total_amount) ? 'paid' : 'partial';
  const paidAt = new Date();
  const updated = await vendorBillRepository.recordPayment(
    client,
    companyId,
    id,
    existing.version,
    { amountPaid: newAmountPaid, utrNumber, status, paidAt },
    actorId,
  );
  if (!updated) throw new AppError('VB_002', [], 'Vendor bill was modified concurrently — retry the payment.');

  if (status === 'paid') {
    await financeTransactionRepository.create(
      client,
      companyId,
      {
        branchId: updated.branch_id,
        transactionDate: paidAt,
        referenceType: 'vendor_bill_payment',
        referenceId: updated.id,
        direction: 'debit',
        amount: updated.amount_paid,
        description: `Vendor bill paid — ${updated.invoice_number} (UTR: ${utrNumber})`,
      },
      actorId,
    );
  }

  return updated;
}

/** Records a (possibly partial) vendor payment: adds to amount_paid, stamps the
 * UTR/transaction id, and recomputes status ('partial' until amount_paid reaches total_amount).
 * Once the bill is fully 'paid', posts a debit finance_transaction so it flows into the
 * existing ledger automatically (mirrors loan.service.js recordRepayment). */
async function recordPayment(companyId, id, payload, actorId) {
  const bill = await withTransaction((client) => recordPaymentWithClient(client, companyId, id, payload, actorId));

  if (bill.status === 'paid') {
    await notifyVendorOfPayment(companyId, bill, actorId);
  }

  return bill;
}

/** Fire-and-forget email to the vendor once their bill is fully paid — queued via the
 * existing notification pipeline (plan.md Service-06), never blocks/rolls back the payment itself. */
async function notifyVendorOfPayment(companyId, bill, actorId) {
  try {
    const vendor = await vendorRepository.findById(companyId, bill.vendor_id);
    if (!vendor?.email) return;

    await notificationService.enqueueNotification(
      companyId,
      {
        userId: null,
        channel: 'email',
        templateKey: 'vendor_bill.paid',
        recipient: vendor.email,
        payload: {
          vendorName: vendor.name,
          invoiceNumber: bill.invoice_number,
          amount: bill.amount_paid,
          utrNumber: bill.utr_number,
          paidAt: bill.paid_at,
        },
      },
      actorId,
    );
  } catch (err) {
    logger.error(`Failed to queue vendor bill payment email for bill ${bill.id}`, err);
  }
}

module.exports = { createFromGrn, getVendorBill, listVendorBills, recordPayment, recordPaymentWithClient };
