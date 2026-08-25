const { Router } = require('express');
const controller = require('../controllers/workOrder.controller');
const authenticate = require('../middlewares/authenticate');
const tenantContext = require('../middlewares/tenantContext');
const { requirePermission } = require('../middlewares/rbac');
const paginate = require('../middlewares/paginate');
const validate = require('../middlewares/validate');
const v = require('../validators/workOrder.validator');

const router = Router();
router.use(authenticate, tenantContext);

router.get('/overhead-per-unit', requirePermission('work_order.manage'), controller.overheadPerUnit);
router.get('/', requirePermission('work_order.manage'), paginate, controller.list);
router.post('/', requirePermission('work_order.manage'), validate(v.createWorkOrder), controller.create);
router.get('/:id', requirePermission('work_order.manage'), controller.getOne);
router.patch('/:id', requirePermission('work_order.manage'), validate(v.updateWorkOrder), controller.update);
router.delete('/:id', requirePermission('work_order.manage'), controller.remove);
router.patch('/:id/floor-stage', requirePermission('work_order.manage'), validate(v.advanceFloorStage), controller.advanceFloorStage);

module.exports = router;
