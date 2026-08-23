const { Router } = require('express');
const controller = require('../controllers/machine.controller');
const authenticate = require('../middlewares/authenticate');
const tenantContext = require('../middlewares/tenantContext');
const { requirePermission } = require('../middlewares/rbac');
const paginate = require('../middlewares/paginate');
const validate = require('../middlewares/validate');
const v = require('../validators/machine.validator');

const router = Router();
router.use(authenticate, tenantContext);

router.get('/', requirePermission('machine.view'), paginate, controller.list);
router.post('/', requirePermission('machine.manage'), validate(v.createMachine), controller.create);
router.get('/downtime-events', requirePermission('machine.view'), paginate, controller.listDowntimeEvents);
router.get('/:id', requirePermission('machine.view'), controller.getOne);
router.patch('/:id', requirePermission('machine.manage'), validate(v.updateMachine), controller.update);
router.delete('/:id', requirePermission('machine.manage'), controller.remove);
router.patch('/:id/report-down', requirePermission('machine.manage'), validate(v.reportDown), controller.reportDown);
router.patch('/:id/resolve-downtime', requirePermission('machine.manage'), controller.resolveDowntime);

module.exports = router;
