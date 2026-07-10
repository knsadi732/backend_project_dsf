const { Router } = require('express');
const controller = require('../controllers/order.controller');
const authenticate = require('../middlewares/authenticate');
const tenantContext = require('../middlewares/tenantContext');
const { requirePermission } = require('../middlewares/rbac');
const paginate = require('../middlewares/paginate');
const validate = require('../middlewares/validate');
const v = require('../validators/order.validator');

const router = Router();
router.use(authenticate, tenantContext);

router.get('/', requirePermission('order.manage'), paginate, controller.list);
router.post('/', requirePermission('order.manage'), validate(v.createOrder), controller.create);
router.get('/:id', requirePermission('order.manage'), controller.getOne);
router.patch('/:id/status', requirePermission('order.manage'), validate(v.transitionStatus), controller.transitionStatus);
router.patch(
  '/:id/payment-status',
  requirePermission('order.manage'),
  validate(v.transitionPayment),
  controller.transitionPayment,
);

module.exports = router;
