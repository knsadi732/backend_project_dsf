const { Router } = require('express');
const controller = require('../controllers/purchaseRequest.controller');
const authenticate = require('../middlewares/authenticate');
const tenantContext = require('../middlewares/tenantContext');
const { requirePermission } = require('../middlewares/rbac');
const paginate = require('../middlewares/paginate');
const validate = require('../middlewares/validate');
const v = require('../validators/purchaseRequest.validator');

const router = Router();
router.use(authenticate, tenantContext);

router.get('/', requirePermission('purchase_request.manage'), paginate, controller.list);
router.post('/', requirePermission('purchase_request.manage'), validate(v.createPurchaseRequest), controller.create);
router.get('/generate-number', requirePermission('purchase_request.manage'), controller.generateNumber);
router.get('/:id', requirePermission('purchase_request.manage'), controller.getOne);
router.patch('/:id/status', requirePermission('purchase_request.manage'), validate(v.decideStatus), controller.decideStatus);

module.exports = router;
