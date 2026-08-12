const { Router } = require('express');
const controller = require('../controllers/vendorQuotation.controller');
const authenticate = require('../middlewares/authenticate');
const tenantContext = require('../middlewares/tenantContext');
const { requirePermission } = require('../middlewares/rbac');
const validate = require('../middlewares/validate');
const v = require('../validators/vendorQuotation.validator');

const router = Router();
router.use(authenticate, tenantContext);

router.post('/', requirePermission('rfq.manage'), validate(v.recordVendorQuotation), controller.create);

module.exports = router;
