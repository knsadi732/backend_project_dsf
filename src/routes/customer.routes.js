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

router.get('/', requirePermission('customer.manage'), paginate, controller.listCustomers);
router.post('/', requirePermission('customer.manage'), validate(v.createCustomer), controller.createCustomer);
router.get('/:id', requirePermission('customer.manage'), controller.getCustomer);
router.patch('/:id', requirePermission('customer.manage'), validate(v.updateCustomer), controller.updateCustomer);
router.delete('/:id', requirePermission('customer.manage'), controller.deleteCustomer);

module.exports = router;
