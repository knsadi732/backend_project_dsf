const { Router } = require('express');
const controller = require('../controllers/productVariant.controller');
const authenticate = require('../middlewares/authenticate');
const tenantContext = require('../middlewares/tenantContext');
const { requirePermission } = require('../middlewares/rbac');
const paginate = require('../middlewares/paginate');
const validate = require('../middlewares/validate');
const v = require('../validators/productVariant.validator');

const router = Router();
router.use(authenticate, tenantContext);

router.get('/generate-sku', requirePermission('product_variant.manage'), controller.generateSku);
router.get('/', requirePermission('product_variant.manage'), paginate, controller.list);
router.post('/', requirePermission('product_variant.manage'), validate(v.createVariant), controller.create);
router.get('/:id', requirePermission('product_variant.manage'), controller.getOne);
router.patch('/:id', requirePermission('product_variant.manage'), validate(v.updateVariant), controller.update);
router.delete('/:id', requirePermission('product_variant.manage'), controller.remove);

module.exports = router;
