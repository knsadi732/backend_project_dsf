const { Router } = require('express');
const controller = require('../controllers/return.controller');
const authenticate = require('../middlewares/authenticate');
const tenantContext = require('../middlewares/tenantContext');
const { requirePermission } = require('../middlewares/rbac');
const paginate = require('../middlewares/paginate');
const validate = require('../middlewares/validate');
const v = require('../validators/return.validator');

const router = Router();
router.use(authenticate, tenantContext);

router.get('/generate-number', requirePermission('return.manage'), controller.generateNumber);
router.get('/summary', requirePermission('return.view'), controller.summary);
router.get('/summary/by-product', requirePermission('return.view'), controller.summaryByProduct);
router.get('/', requirePermission('return.view'), paginate, controller.list);
router.post('/', requirePermission('return.manage'), validate(v.createReturn), controller.create);
router.get('/:id', requirePermission('return.view'), controller.getOne);
router.patch('/:id', requirePermission('return.manage'), validate(v.updateReturn), controller.update);
router.delete('/:id', requirePermission('return.manage'), controller.remove);

module.exports = router;
