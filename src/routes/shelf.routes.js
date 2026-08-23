const { Router } = require('express');
const controller = require('../controllers/shelf.controller');
const authenticate = require('../middlewares/authenticate');
const tenantContext = require('../middlewares/tenantContext');
const { requirePermission } = require('../middlewares/rbac');
const paginate = require('../middlewares/paginate');
const validate = require('../middlewares/validate');
const v = require('../validators/shelf.validator');

const router = Router();
router.use(authenticate, tenantContext);

router.get('/', requirePermission('warehouse_structure.manage'), paginate, controller.list);
router.post('/', requirePermission('warehouse_structure.manage'), validate(v.createShelf), controller.create);
router.get('/:id', requirePermission('warehouse_structure.manage'), controller.getOne);
router.patch('/:id', requirePermission('warehouse_structure.manage'), validate(v.updateShelf), controller.update);
router.delete('/:id', requirePermission('warehouse_structure.manage'), controller.remove);

module.exports = router;
