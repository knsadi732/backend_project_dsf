const { Router } = require('express');
const controller = require('../controllers/finance.controller');
const authenticate = require('../middlewares/authenticate');
const tenantContext = require('../middlewares/tenantContext');
const { requirePermission } = require('../middlewares/rbac');
const paginate = require('../middlewares/paginate');
const validate = require('../middlewares/validate');
const v = require('../validators/finance.validator');

const router = Router();
router.use(authenticate, tenantContext);

// Accountant scope
router.get('/transactions', requirePermission('finance.ledger.view'), paginate, controller.listTransactions);
router.post('/transactions', requirePermission('finance.transaction.create'), validate(v.recordTransaction), controller.recordTransaction);

router.get('/payment-slips', requirePermission('finance.payment_slip.issue'), paginate, controller.listPaymentSlips);
router.post('/payment-slips', requirePermission('finance.payment_slip.issue'), validate(v.issuePaymentSlip), controller.issuePaymentSlip);

router.get('/expenses', requirePermission('finance.expense.record'), paginate, controller.listExpenses);
router.post('/expenses', requirePermission('finance.expense.record'), validate(v.recordExpense), controller.recordExpense);

router.get('/bills', requirePermission('finance.bill.print'), paginate, controller.listBills);
router.post('/bills/print', requirePermission('finance.bill.print'), validate(v.printBill), controller.printBill);

// CA scope
router.get('/ledger/summary', requirePermission('finance.ledger.view'), controller.getLedgerSummary);

router.get('/fiscal-periods', requirePermission('finance.period.close'), paginate, controller.listFiscalPeriods);
router.post('/fiscal-periods', requirePermission('finance.period.close'), validate(v.createFiscalPeriod), controller.createFiscalPeriod);
router.patch('/fiscal-periods/:id/close', requirePermission('finance.period.close'), controller.closeFiscalPeriod);

router.get('/gst', requirePermission('finance.gst.view'), controller.getGstProfile);

router.get('/audits', requirePermission('finance.audit.view'), paginate, controller.listStatutoryAudits);
router.post('/audits', requirePermission('finance.audit.view'), validate(v.recordStatutoryAudit), controller.recordStatutoryAudit);

router.get('/ledger/cross-verify', requirePermission('finance.ledger.cross_verify'), controller.crossVerifyLedger);

module.exports = router;
