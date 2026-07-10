const asyncHandler = require('../utils/asyncHandler');
const { sendSuccess } = require('../utils/response');
const AppError = require('../utils/AppError');
const documentService = require('../services/document.service');
const storageService = require('../services/storage.service');

const upload = asyncHandler(async (req, res) => {
  if (!req.file) throw new AppError('VALIDATION_001', [{ field: 'file', message: '"file" is required' }]);
  const document = await documentService.uploadDocument(req.tenant.companyId, { ...req.body, file: req.file }, req.user.id);
  return sendSuccess(res, { message: 'Document uploaded.', data: document, statusCode: 201 });
});

const list = asyncHandler(async (req, res) => {
  const { rows, meta } = await documentService.listDocuments(req.tenant.companyId, req.pagination, {
    entityType: req.query.entity_type,
    entityId: req.query.entity_id,
  });
  return sendSuccess(res, { message: 'Documents list.', data: rows, meta });
});

const getOne = asyncHandler(async (req, res) => {
  const document = await documentService.getDocument(req.tenant.companyId, req.params.id);
  return sendSuccess(res, { message: 'Document detail.', data: document });
});

const getDownloadUrl = asyncHandler(async (req, res) => {
  const result = await documentService.getDownloadUrl(req.tenant.companyId, req.params.id);
  return sendSuccess(res, { message: 'Pre-signed download URL.', data: result });
});

const download = asyncHandler(async (req, res) => {
  const document = await documentService.authorizeDownload(req.params.id, req.query.token);
  res.setHeader('Content-Type', document.mime_type);
  res.setHeader('Content-Disposition', `inline; filename="${document.file_name}"`);
  storageService.readFileStream(document.file_key).pipe(res);
});

const remove = asyncHandler(async (req, res) => {
  await documentService.deleteDocument(req.tenant.companyId, req.params.id, req.user.id);
  return sendSuccess(res, { message: 'Document deleted.' });
});

module.exports = { upload, list, getOne, getDownloadUrl, download, remove };
