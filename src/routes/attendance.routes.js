const { Router } = require('express');
const controller = require('../controllers/attendance.controller');
const authenticate = require('../middlewares/authenticate');
const tenantContext = require('../middlewares/tenantContext');
const { requirePermission } = require('../middlewares/rbac');
const paginate = require('../middlewares/paginate');

const router = Router();
router.use(authenticate, tenantContext);

router.get('/', requirePermission('attendance.view'), paginate, controller.listAttendance);

module.exports = router;
