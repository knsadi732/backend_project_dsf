const { Router } = require('express');
const controller = require('../controllers/loan.controller');
const authenticate = require('../middlewares/authenticate');
const tenantContext = require('../middlewares/tenantContext');
const { requirePermission } = require('../middlewares/rbac');
const paginate = require('../middlewares/paginate');
const validate = require('../middlewares/validate');
const v = require('../validators/loan.validator');

const router = Router();
router.use(authenticate, tenantContext);

router.get('/generate-number', requirePermission('loan.manage'), controller.generateNumber);
router.get('/', requirePermission('loan.view'), paginate, controller.list);
router.post('/', requirePermission('loan.manage'), validate(v.createLoan), controller.create);
router.get('/:id', requirePermission('loan.view'), controller.getOne);
router.patch('/:id/write-off', requirePermission('loan.manage'), controller.writeOff);
router.get('/:id/repayments', requirePermission('loan.view'), paginate, controller.listRepayments);
router.post('/:id/repayments', requirePermission('loan.manage'), validate(v.recordRepayment), controller.recordRepayment);

module.exports = router;
