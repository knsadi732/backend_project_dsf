const { Router } = require('express');
const controller = require('../controllers/rfq.controller');
const authenticate = require('../middlewares/authenticate');
const tenantContext = require('../middlewares/tenantContext');
const { requirePermission } = require('../middlewares/rbac');
const paginate = require('../middlewares/paginate');
const validate = require('../middlewares/validate');
const v = require('../validators/rfq.validator');

const router = Router();
router.use(authenticate, tenantContext);

router.get('/', requirePermission('rfq.view'), paginate, controller.list);
router.post('/', requirePermission('rfq.manage'), validate(v.createRfq), controller.create);
router.get('/generate-number', requirePermission('rfq.manage'), controller.generateNumber);
router.get('/:id', requirePermission('rfq.view'), controller.getOne);
router.patch('/:id/send', requirePermission('rfq.manage'), controller.send);
router.patch('/:id/select-vendor', requirePermission('rfq.manage'), validate(v.selectVendor), controller.selectVendor);

module.exports = router;
