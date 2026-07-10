const { Router } = require('express');
const controller = require('../controllers/analytics.controller');
const authenticate = require('../middlewares/authenticate');
const tenantContext = require('../middlewares/tenantContext');
const { requirePermission } = require('../middlewares/rbac');

const router = Router();
router.use(authenticate, tenantContext);

router.get('/dashboard', requirePermission('analytics.view'), controller.getDashboard);
router.get('/dashboard/:key', requirePermission('analytics.view'), controller.getWidget);
router.post('/regenerate', requirePermission('analytics.view'), controller.regenerate);

module.exports = router;
