const { Router } = require('express');
const controller = require('../controllers/vendorBill.controller');
const authenticate = require('../middlewares/authenticate');
const tenantContext = require('../middlewares/tenantContext');
const { requirePermission } = require('../middlewares/rbac');
const paginate = require('../middlewares/paginate');
const validate = require('../middlewares/validate');
const v = require('../validators/vendorBill.validator');

const router = Router();
router.use(authenticate, tenantContext);

router.get('/', requirePermission('vendor_bill.view'), paginate, controller.list);
router.get('/:id', requirePermission('vendor_bill.view'), controller.getOne);
router.post('/:id/payment', requirePermission('vendor_bill.manage'), validate(v.recordPayment), controller.recordPayment);

module.exports = router;
