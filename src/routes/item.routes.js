const { Router } = require('express');
const controller = require('../controllers/item.controller');
const authenticate = require('../middlewares/authenticate');
const tenantContext = require('../middlewares/tenantContext');
const { requirePermission } = require('../middlewares/rbac');
const paginate = require('../middlewares/paginate');
const validate = require('../middlewares/validate');
const v = require('../validators/item.validator');

const router = Router();
router.use(authenticate, tenantContext);

router.get('/categories/generate-code', requirePermission('item.manage'), controller.generateCategoryCode);
router.get('/categories', requirePermission('item.manage'), paginate, controller.listItemCategories);
router.post('/categories', requirePermission('item.manage'), validate(v.createItemCategory), controller.createItemCategory);
router.get('/categories/:id', requirePermission('item.manage'), controller.getItemCategory);
router.patch('/categories/:id', requirePermission('item.manage'), validate(v.updateItemCategory), controller.updateItemCategory);

router.get('/stock', requirePermission('item.stock.view'), paginate, controller.listItemStock);
router.get('/stock/movements', requirePermission('item.stock.view'), paginate, controller.listItemStockMovements);
router.post('/stock/receive', requirePermission('item.stock.manage'), validate(v.receiveStock), controller.receiveStock);
router.post('/stock/consume', requirePermission('item.stock.manage'), validate(v.consumeStock), controller.consumeStock);

router.get('/generate-code', requirePermission('item.manage'), controller.generateItemCode);

router.get('/variants/generate-sku', requirePermission('item.manage'), controller.generateItemVariantSku);
router.get('/variants', requirePermission('item.manage'), paginate, controller.listItemVariants);
router.post('/variants', requirePermission('item.manage'), validate(v.createItemVariant), controller.createItemVariant);
router.get('/variants/:id', requirePermission('item.manage'), controller.getItemVariant);
router.patch('/variants/:id', requirePermission('item.manage'), validate(v.updateItemVariant), controller.updateItemVariant);

router.get('/', requirePermission('item.manage'), paginate, controller.listItems);
router.post('/', requirePermission('item.manage'), validate(v.createItem), controller.createItem);
router.get('/:id', requirePermission('item.manage'), controller.getItem);
router.patch('/:id', requirePermission('item.manage'), validate(v.updateItem), controller.updateItem);

module.exports = router;
