const { Router } = require('express');
const controller = require('../controllers/role.controller');
const authenticate = require('../middlewares/authenticate');
const tenantContext = require('../middlewares/tenantContext');
const { requirePermission } = require('../middlewares/rbac');

const router = Router();
router.use(authenticate, tenantContext);

router.get('/', requirePermission('user.manage'), controller.listRoles);

module.exports = router;
