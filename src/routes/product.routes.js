const { Router } = require('express');
const controller = require('../controllers/product.controller');
const authenticate = require('../middlewares/authenticate');
const tenantContext = require('../middlewares/tenantContext');
const { requirePermission } = require('../middlewares/rbac');
const paginate = require('../middlewares/paginate');
const validate = require('../middlewares/validate');
const v = require('../validators/product.validator');

const router = Router();
router.use(authenticate, tenantContext);

router.get('/categories', requirePermission('product.manage'), paginate, controller.listCategories);
router.post('/categories', requirePermission('product.manage'), validate(v.createCategory), controller.createCategory);
router.patch('/categories/:id', requirePermission('product.manage'), validate(v.updateCategory), controller.updateCategory);
router.delete('/categories/:id', requirePermission('product.manage'), controller.deleteCategory);

router.get('/stock', requirePermission('product.manage'), paginate, controller.listStock);
router.get('/stock/summary', requirePermission('product.manage'), controller.getStockSummary);
router.post('/stock/receive', requirePermission('product.manage'), validate(v.receiveStock), controller.receiveStock);

router.get('/', requirePermission('product.manage'), paginate, controller.listProducts);
router.post('/', requirePermission('product.manage'), validate(v.createProduct), controller.createProduct);
router.get('/:id', requirePermission('product.manage'), controller.getProduct);
router.patch('/:id', requirePermission('product.manage'), validate(v.updateProduct), controller.updateProduct);
router.delete('/:id', requirePermission('product.manage'), controller.deleteProduct);

module.exports = router;
