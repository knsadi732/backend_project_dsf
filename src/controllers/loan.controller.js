const asyncHandler = require('../utils/asyncHandler');
const { sendSuccess } = require('../utils/response');
const loanService = require('../services/loan.service');

const list = asyncHandler(async (req, res) => {
  const { rows, meta } = await loanService.listLoans(req.tenant.companyId, req.pagination, { status: req.query.status });
  return sendSuccess(res, { message: 'Loans list.', data: rows, meta });
});

const getOne = asyncHandler(async (req, res) => {
  const loan = await loanService.getLoan(req.tenant.companyId, req.params.id);
  return sendSuccess(res, { message: 'Loan detail.', data: loan });
});

const create = asyncHandler(async (req, res) => {
  const loan = await loanService.createLoan(req.tenant.companyId, req.body, req.user.id);
  return sendSuccess(res, { message: 'Loan recorded.', data: loan, statusCode: 201 });
});

const generateNumber = asyncHandler(async (req, res) => {
  const loanNumber = await loanService.generateLoanNumber();
  return sendSuccess(res, { message: 'Loan number generated.', data: { loanNumber } });
});

const recordRepayment = asyncHandler(async (req, res) => {
  const repayment = await loanService.recordRepayment(req.tenant.companyId, req.params.id, req.body, req.user.id);
  return sendSuccess(res, { message: 'Repayment recorded.', data: repayment, statusCode: 201 });
});

const listRepayments = asyncHandler(async (req, res) => {
  const { rows, meta } = await loanService.listRepayments(req.tenant.companyId, req.params.id, req.pagination);
  return sendSuccess(res, { message: 'Repayments list.', data: rows, meta });
});

const writeOff = asyncHandler(async (req, res) => {
  const loan = await loanService.writeOffLoan(req.tenant.companyId, req.params.id, req.user.id);
  return sendSuccess(res, { message: 'Loan written off.', data: loan });
});

module.exports = { list, getOne, create, generateNumber, recordRepayment, listRepayments, writeOff };
