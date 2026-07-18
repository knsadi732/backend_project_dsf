const { Router } = require('express');
const controller = require('../controllers/department.controller');
const authenticate = require('../middlewares/authenticate');
const tenantContext = require('../middlewares/tenantContext');
const { requirePermission } = require('../middlewares/rbac');
const paginate = require('../middlewares/paginate');
const validate = require('../middlewares/validate');
const v = require('../validators/department.validator');

const router = Router();
router.use(authenticate, tenantContext);

router.get('/', requirePermission('department.manage'), paginate, controller.listDepartments);
router.post('/', requirePermission('department.manage'), validate(v.createDepartment), controller.createDepartment);
router.get('/:id', requirePermission('department.manage'), controller.getDepartment);
router.patch('/:id', requirePermission('department.manage'), validate(v.updateDepartment), controller.updateDepartment);
router.delete('/:id', requirePermission('department.manage'), controller.deleteDepartment);

module.exports = router;
