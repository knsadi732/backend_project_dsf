const { Router } = require('express');
const controller = require('../controllers/appNotification.controller');
const authenticate = require('../middlewares/authenticate');
const tenantContext = require('../middlewares/tenantContext');
const paginate = require('../middlewares/paginate');
const validate = require('../middlewares/validate');
const v = require('../validators/appNotification.validator');

const router = Router();
router.use(authenticate, tenantContext);

// Every authenticated user reads/manages only their own feed (own targeted
// rows + company broadcasts) — no separate RBAC permission needed, same as
// "your own attendance" style personal-scope endpoints elsewhere.
router.get('/', paginate, controller.list);
router.post('/', validate(v.createAppNotification), controller.create);
router.patch('/mark-all-read', controller.markAllRead);
router.patch('/:id/read', controller.markRead);
router.patch('/:id/archive', controller.archive);

module.exports = router;
