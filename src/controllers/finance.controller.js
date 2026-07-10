const asyncHandler = require('../utils/asyncHandler');
const { sendSuccess } = require('../utils/response');
const financeService = require('../services/finance.service');
const fiscalPeriodService = require('../services/fiscalPeriod.service');

const recordTransaction = asyncHandler(async (req, res) => {
  const tx = await financeService.recordTransaction(req.tenant.companyId, req.body, req.user.id);
  return sendSuccess(res, { message: 'Transaction recorded.', data: tx, statusCode: 201 });
});

const listTransactions = asyncHandler(async (req, res) => {
  const { rows, meta } = await financeService.listTransactions(req.tenant.companyId, req.pagination, {
    referenceType: req.query.reference_type,
  });
  return sendSuccess(res, { message: 'Transactions list.', data: rows, meta });
});

const issuePaymentSlip = asyncHandler(async (req, res) => {
  const slip = await financeService.issuePaymentSlip(req.tenant.companyId, req.body, req.user.id);
  return sendSuccess(res, { message: 'Payment slip issued.', data: slip, statusCode: 201 });
});

const listPaymentSlips = asyncHandler(async (req, res) => {
  const { rows, meta } = await financeService.listPaymentSlips(req.tenant.companyId, req.pagination);
  return sendSuccess(res, { message: 'Payment slips list.', data: rows, meta });
});

const recordExpense = asyncHandler(async (req, res) => {
  const expense = await financeService.recordExpense(req.tenant.companyId, req.body, req.user.id);
  return sendSuccess(res, { message: 'Expense recorded.', data: expense, statusCode: 201 });
});

const listExpenses = asyncHandler(async (req, res) => {
  const { rows, meta } = await financeService.listExpenses(req.tenant.companyId, req.pagination);
  return sendSuccess(res, { message: 'Expenses list.', data: rows, meta });
});

const printBill = asyncHandler(async (req, res) => {
  const bill = await financeService.printBill(req.tenant.companyId, req.body.orderId, req.user.id);
  return sendSuccess(res, { message: 'Bill generated.', data: bill, statusCode: 201 });
});

const listBills = asyncHandler(async (req, res) => {
  const { rows, meta } = await financeService.listBills(req.tenant.companyId, req.pagination);
  return sendSuccess(res, { message: 'Bills list.', data: rows, meta });
});

const getLedgerSummary = asyncHandler(async (req, res) => {
  const summary = await financeService.getLedgerSummary(req.tenant.companyId, { from: req.query.from, to: req.query.to });
  return sendSuccess(res, { message: 'Ledger summary.', data: summary });
});

const listFiscalPeriods = asyncHandler(async (req, res) => {
  const { rows, meta } = await fiscalPeriodService.listPeriods(req.tenant.companyId, req.pagination);
  return sendSuccess(res, { message: 'Fiscal periods.', data: rows, meta });
});

const createFiscalPeriod = asyncHandler(async (req, res) => {
  const period = await fiscalPeriodService.createPeriod(req.tenant.companyId, req.body, req.user.id);
  return sendSuccess(res, { message: 'Fiscal period created.', data: period, statusCode: 201 });
});

const closeFiscalPeriod = asyncHandler(async (req, res) => {
  const period = await fiscalPeriodService.closePeriod(req.tenant.companyId, req.params.id, req.user.id);
  return sendSuccess(res, { message: 'Fiscal period closed.', data: period });
});

module.exports = {
  recordTransaction,
  listTransactions,
  issuePaymentSlip,
  listPaymentSlips,
  recordExpense,
  listExpenses,
  printBill,
  listBills,
  getLedgerSummary,
  listFiscalPeriods,
  createFiscalPeriod,
  closeFiscalPeriod,
};
