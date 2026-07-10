const { Router } = require('express');
const controller = require('../controllers/user.controller');
const authenticate = require('../middlewares/authenticate');
const tenantContext = require('../middlewares/tenantContext');
const { requirePermission } = require('../middlewares/rbac');
const paginate = require('../middlewares/paginate');
const validate = require('../middlewares/validate');
const v = require('../validators/user.validator');

const router = Router();
router.use(authenticate, tenantContext);

router.get('/', requirePermission('user.manage'), paginate, controller.listUsers);
router.post('/', requirePermission('user.manage'), validate(v.createUser), controller.createUser);
router.get('/:id', requirePermission('user.manage'), controller.getUser);
router.patch('/:id', requirePermission('user.manage'), validate(v.updateUser), controller.updateUser);
router.delete('/:id', requirePermission('user.manage'), controller.deleteUser);

module.exports = router;
