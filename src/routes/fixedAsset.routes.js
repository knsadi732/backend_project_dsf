const { Router } = require('express');
const controller = require('../controllers/fixedAsset.controller');
const authenticate = require('../middlewares/authenticate');
const tenantContext = require('../middlewares/tenantContext');
const { requirePermission } = require('../middlewares/rbac');
const paginate = require('../middlewares/paginate');
const validate = require('../middlewares/validate');
const v = require('../validators/fixedAsset.validator');

const router = Router();
router.use(authenticate, tenantContext);

router.get('/maintenance-logs', requirePermission('fixed_asset.view'), paginate, controller.listMaintenanceLogs);

router.get('/', requirePermission('fixed_asset.view'), paginate, controller.listAssets);
router.post('/', requirePermission('fixed_asset.manage'), validate(v.registerAsset), controller.registerAsset);
router.get('/:id', requirePermission('fixed_asset.view'), controller.getAsset);
router.patch('/:id/reassign', requirePermission('fixed_asset.manage'), validate(v.reassignAsset), controller.reassignAsset);
router.post('/:id/maintenance', requirePermission('fixed_asset.manage'), validate(v.recordMaintenance), controller.recordMaintenance);
router.post('/:id/dispose', requirePermission('fixed_asset.manage'), validate(v.disposeAsset), controller.disposeAsset);

module.exports = router;
