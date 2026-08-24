const { Router } = require('express');
const controller = require('../controllers/payable.controller');
const authenticate = require('../middlewares/authenticate');
const tenantContext = require('../middlewares/tenantContext');
const { requirePermission } = require('../middlewares/rbac');
const paginate = require('../middlewares/paginate');
const validate = require('../middlewares/validate');
const v = require('../validators/payable.validator');

const router = Router();
router.use(authenticate, tenantContext);

router.get('/generate-number', requirePermission('payable.manage'), controller.generateNumber);
router.get('/', requirePermission('payable.view'), paginate, controller.list);
router.post('/', requirePermission('payable.manage'), validate(v.createPayable), controller.create);
router.get('/:id', requirePermission('payable.view'), controller.getOne);
router.patch('/:id/write-off', requirePermission('payable.manage'), controller.writeOff);
router.get('/:id/payments', requirePermission('payable.view'), paginate, controller.listPayments);
router.post('/:id/payments', requirePermission('payable.manage'), validate(v.recordPayment), controller.recordPayment);

module.exports = router;
