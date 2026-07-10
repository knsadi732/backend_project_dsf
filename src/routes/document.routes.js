const { Router } = require('express');
const multer = require('multer');
const controller = require('../controllers/document.controller');
const authenticate = require('../middlewares/authenticate');
const tenantContext = require('../middlewares/tenantContext');
const { requirePermission } = require('../middlewares/rbac');
const paginate = require('../middlewares/paginate');
const validate = require('../middlewares/validate');
const v = require('../validators/document.validator');
const env = require('../config/env');

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: env.documents.maxUploadSizeMb * 1024 * 1024 },
});

const router = Router();

// Public: the pre-signed token itself is the authorization proof (or the document is public).
router.get('/:id/download', controller.download);

router.use(authenticate, tenantContext);

router.get('/', requirePermission('document.manage'), paginate, controller.list);
router.post(
  '/',
  requirePermission('document.manage'),
  upload.single('file'),
  validate(v.uploadDocument),
  controller.upload,
);
router.get('/:id', requirePermission('document.manage'), controller.getOne);
router.get('/:id/download-url', requirePermission('document.manage'), controller.getDownloadUrl);
router.delete('/:id', requirePermission('document.manage'), controller.remove);

module.exports = router;
