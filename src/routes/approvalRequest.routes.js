const { Router } = require('express');
const controller = require('../controllers/approvalRequest.controller');
const authenticate = require('../middlewares/authenticate');
const tenantContext = require('../middlewares/tenantContext');
const { requirePermission } = require('../middlewares/rbac');
const paginate = require('../middlewares/paginate');
const validate = require('../middlewares/validate');
const v = require('../validators/approvalRequest.validator');

const router = Router();
router.use(authenticate, tenantContext);

router.get('/', requirePermission('approval_request.view'), paginate, controller.list);
router.post('/vendor-payment', requirePermission('approval_request.create'), validate(v.createVendorPaymentRequest), controller.createVendorPaymentRequest);
router.post('/credit-limit-override', requirePermission('approval_request.create'), validate(v.createCreditLimitOverrideRequest), controller.createCreditLimitOverrideRequest);
router.get('/:id', requirePermission('approval_request.view'), controller.getOne);
router.patch('/:id/approve', requirePermission('approval_request.approve'), controller.approve);
router.patch('/:id/reject', requirePermission('approval_request.approve'), controller.reject);

module.exports = router;
