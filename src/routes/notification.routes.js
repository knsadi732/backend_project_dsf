const { Router } = require('express');
const controller = require('../controllers/notification.controller');
const authenticate = require('../middlewares/authenticate');
const tenantContext = require('../middlewares/tenantContext');
const { requirePermission } = require('../middlewares/rbac');
const paginate = require('../middlewares/paginate');
const validate = require('../middlewares/validate');
const v = require('../validators/notification.validator');

const router = Router();
router.use(authenticate, tenantContext);

router.get('/', requirePermission('notification.manage'), paginate, controller.list);
router.post('/', requirePermission('notification.manage'), validate(v.send), controller.send);

module.exports = router;
