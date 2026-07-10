const { Router } = require('express');
const controller = require('../controllers/user.controller');
const authenticate = require('../middlewares/authenticate');
const tenantContext = require('../middlewares/tenantContext');
const { requirePermission } = require('../middlewares/rbac');
const paginate = require('../middlewares/paginate');

const router = Router();
router.use(authenticate, tenantContext);

router.get('/', requirePermission('audit.log.view'), paginate, controller.listAuditLogs);

module.exports = router;
