const { Router } = require('express');
const controller = require('../controllers/purchaseOrder.controller');
const authenticate = require('../middlewares/authenticate');
const tenantContext = require('../middlewares/tenantContext');
const { requirePermission } = require('../middlewares/rbac');
const paginate = require('../middlewares/paginate');
const validate = require('../middlewares/validate');
const v = require('../validators/purchaseOrder.validator');

const router = Router();
router.use(authenticate, tenantContext);

router.get('/', requirePermission('purchase_order.manage'), paginate, controller.list);
router.post('/', requirePermission('purchase_order.manage'), validate(v.createPurchaseOrder), controller.create);
router.get('/:id', requirePermission('purchase_order.manage'), controller.getOne);
router.patch('/:id/status', requirePermission('purchase_order.manage'), validate(v.transitionStatus), controller.transitionStatus);

module.exports = router;
