const { Router } = require('express');
const multer = require('multer');
const controller = require('../controllers/grn.controller');
const authenticate = require('../middlewares/authenticate');
const tenantContext = require('../middlewares/tenantContext');
const { requirePermission } = require('../middlewares/rbac');
const paginate = require('../middlewares/paginate');
const validate = require('../middlewares/validate');
const v = require('../validators/grn.validator');
const AppError = require('../utils/AppError');
const env = require('../config/env');

const ALLOWED_INVOICE_MIME_TYPES = ['application/pdf', 'image/jpeg', 'image/png'];

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: env.documents.maxUploadSizeMb * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (!ALLOWED_INVOICE_MIME_TYPES.includes(file.mimetype)) {
      return cb(new AppError('GRN_002'));
    }
    cb(null, true);
  },
});

const router = Router();
router.use(authenticate, tenantContext);

router.get('/', requirePermission('grn.view'), paginate, controller.list);
router.post(
  '/invoice',
  requirePermission('grn.manage'),
  upload.single('file'),
  validate(v.uploadInvoice),
  controller.uploadInvoice,
);
router.get('/:id', requirePermission('grn.view'), controller.getOne);

module.exports = router;
