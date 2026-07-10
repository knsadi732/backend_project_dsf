const { Router } = require('express');
const controller = require('../controllers/party.controller');
const authenticate = require('../middlewares/authenticate');
const tenantContext = require('../middlewares/tenantContext');
const { requirePermission } = require('../middlewares/rbac');
const paginate = require('../middlewares/paginate');
const validate = require('../middlewares/validate');
const v = require('../validators/party.validator');

const router = Router();
router.use(authenticate, tenantContext);

router.get('/', requirePermission('vendor.manage'), paginate, controller.listVendors);
router.post('/', requirePermission('vendor.manage'), validate(v.createVendor), controller.createVendor);
router.get('/:id', requirePermission('vendor.manage'), controller.getVendor);
router.patch('/:id', requirePermission('vendor.manage'), validate(v.updateVendor), controller.updateVendor);
router.delete('/:id', requirePermission('vendor.manage'), controller.deleteVendor);

module.exports = router;
