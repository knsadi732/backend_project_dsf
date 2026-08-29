const { Router } = require('express');
const controller = require('../controllers/forecast.controller');
const authenticate = require('../middlewares/authenticate');
const tenantContext = require('../middlewares/tenantContext');
const { requirePermission } = require('../middlewares/rbac');

const router = Router();
router.use(authenticate, tenantContext);

router.get('/sales', requirePermission('forecast.view'), controller.getSalesForecast);
router.get('/size', requirePermission('forecast.view'), controller.getSizeForecast);
router.get('/channel', requirePermission('forecast.view'), controller.getChannelForecast);

module.exports = router;
