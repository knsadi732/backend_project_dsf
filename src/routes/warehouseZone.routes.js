const { Router } = require('express');
const controller = require('../controllers/warehouseZone.controller');
const authenticate = require('../middlewares/authenticate');
const tenantContext = require('../middlewares/tenantContext');
const { requirePermission } = require('../middlewares/rbac');
const paginate = require('../middlewares/paginate');
const validate = require('../middlewares/validate');
const v = require('../validators/warehouseZone.validator');

const router = Router();
router.use(authenticate, tenantContext);

router.get('/', requirePermission('warehouse_structure.manage'), paginate, controller.list);
router.post('/', requirePermission('warehouse_structure.manage'), validate(v.createZone), controller.create);
router.get('/:id', requirePermission('warehouse_structure.manage'), controller.getOne);
router.patch('/:id', requirePermission('warehouse_structure.manage'), validate(v.updateZone), controller.update);
router.delete('/:id', requirePermission('warehouse_structure.manage'), controller.remove);

module.exports = router;
