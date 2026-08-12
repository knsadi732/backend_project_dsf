const { Router } = require('express');
const controller = require('../controllers/bom.controller');
const authenticate = require('../middlewares/authenticate');
const tenantContext = require('../middlewares/tenantContext');
const { requirePermission } = require('../middlewares/rbac');
const paginate = require('../middlewares/paginate');
const validate = require('../middlewares/validate');
const v = require('../validators/bom.validator');

const router = Router();
router.use(authenticate, tenantContext);

router.get('/', requirePermission('bom.manage'), paginate, controller.list);
router.post('/', requirePermission('bom.manage'), validate(v.createBomLine), controller.create);
router.get('/:id', requirePermission('bom.manage'), controller.getOne);
router.patch('/:id', requirePermission('bom.manage'), validate(v.updateBomLine), controller.update);
router.delete('/:id', requirePermission('bom.manage'), controller.remove);

module.exports = router;
