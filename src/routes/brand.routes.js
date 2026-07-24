const { Router } = require('express');
const controller = require('../controllers/brand.controller');
const authenticate = require('../middlewares/authenticate');
const tenantContext = require('../middlewares/tenantContext');
const { requirePermission } = require('../middlewares/rbac');
const paginate = require('../middlewares/paginate');
const validate = require('../middlewares/validate');
const v = require('../validators/brand.validator');

const router = Router();
router.use(authenticate, tenantContext);

router.get('/', requirePermission('brand.manage'), paginate, controller.listBrands);
router.post('/', requirePermission('brand.manage'), validate(v.createBrand), controller.createBrand);
router.get('/:id', requirePermission('brand.manage'), controller.getBrand);
router.patch('/:id', requirePermission('brand.manage'), validate(v.updateBrand), controller.updateBrand);
router.delete('/:id', requirePermission('brand.manage'), controller.deleteBrand);

module.exports = router;
