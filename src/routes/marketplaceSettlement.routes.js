const { Router } = require('express');
const controller = require('../controllers/marketplaceSettlement.controller');
const authenticate = require('../middlewares/authenticate');
const tenantContext = require('../middlewares/tenantContext');
const { requirePermission } = require('../middlewares/rbac');
const paginate = require('../middlewares/paginate');
const validate = require('../middlewares/validate');
const v = require('../validators/marketplaceSettlement.validator');

const router = Router();
router.use(authenticate, tenantContext);

router.get('/generate-number', requirePermission('marketplace_settlement.manage'), controller.generateNumber);
router.get('/monthly-channel-cost', requirePermission('marketplace_settlement.view'), controller.monthlyChannelCost);
router.get('/monthly-product-cost', requirePermission('marketplace_settlement.view'), controller.monthlyProductCost);
router.get('/', requirePermission('marketplace_settlement.view'), paginate, controller.list);
router.post('/', requirePermission('marketplace_settlement.manage'), validate(v.createSettlement), controller.create);
router.get('/:id', requirePermission('marketplace_settlement.view'), controller.getOne);

module.exports = router;
