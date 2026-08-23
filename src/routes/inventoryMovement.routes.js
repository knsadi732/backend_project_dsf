const { Router } = require('express');
const controller = require('../controllers/inventoryMovement.controller');
const authenticate = require('../middlewares/authenticate');
const tenantContext = require('../middlewares/tenantContext');
const { requirePermission } = require('../middlewares/rbac');
const paginate = require('../middlewares/paginate');

const router = Router();
router.use(authenticate, tenantContext);

// Read-only audit trail — rows are written internally by stock.service.js,
// never via a client-callable create route.
router.get('/', requirePermission('inventory_movement.view'), paginate, controller.list);

module.exports = router;
