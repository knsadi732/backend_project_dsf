const { Router } = require('express');
const controller = require('../controllers/gstReport.controller');
const authenticate = require('../middlewares/authenticate');
const tenantContext = require('../middlewares/tenantContext');
const { requirePermission } = require('../middlewares/rbac');

const router = Router();
router.use(authenticate, tenantContext);

router.get('/gstr1', requirePermission('finance.gst.view'), controller.getGstr1);
router.get('/gstr3b', requirePermission('finance.gst.view'), controller.getGstr3b);
router.get('/gstr2b-proxy', requirePermission('finance.gst.view'), controller.getGstr2bProxy);
router.get('/pnl', requirePermission('finance.ledger.view'), controller.getProfitAndLoss);

module.exports = router;
