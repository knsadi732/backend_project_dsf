const { Router } = require('express');
const controller = require('../controllers/marketplaceChannel.controller');
const authenticate = require('../middlewares/authenticate');
const tenantContext = require('../middlewares/tenantContext');
const { requirePermission } = require('../middlewares/rbac');
const validate = require('../middlewares/validate');
const v = require('../validators/marketplaceChannel.validator');

const router = Router();
router.use(authenticate, tenantContext);

router.get('/', requirePermission('marketplace_channel.view'), controller.list);
router.post('/', requirePermission('marketplace_channel.manage'), validate(v.createChannel), controller.create);
router.get('/:id', requirePermission('marketplace_channel.view'), controller.getOne);
router.patch('/:id', requirePermission('marketplace_channel.manage'), validate(v.updateChannel), controller.update);

module.exports = router;
