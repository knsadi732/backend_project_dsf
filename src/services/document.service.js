const jwt = require('jsonwebtoken');
const env = require('../config/env');
const AppError = require('../utils/AppError');
const { buildPaginationMeta } = require('../utils/pagination');
const documentRepository = require('../repositories/document.repository');
const storageService = require('./storage.service');

async function uploadDocument(companyId, { branchId, warehouseId, entityType, entityId, isPublic, file }, actorId) {
  const fileKey = await storageService.saveFile({ companyId, buffer: file.buffer, originalName: file.originalname });

  return documentRepository.create(
    companyId,
    {
      branchId,
      warehouseId,
      entityType,
      entityId,
      fileKey,
      fileName: file.originalname,
      mimeType: file.mimetype,
      sizeBytes: file.size,
      isPublic: isPublic === 'true' || isPublic === true,
    },
    actorId,
  );
}

async function listDocuments(companyId, pagination, filters) {
  const { rows, totalRecords } = await documentRepository.list(companyId, pagination, filters);
  return { rows, meta: buildPaginationMeta({ page: pagination.page, limit: pagination.limit, totalRecords }) };
}

async function getDocument(companyId, id) {
  const document = await documentRepository.findById(companyId, id);
  if (!document) throw new AppError('DOC_001');
  return document;
}

/** Public documents resolve to a stable, absolute URL; everything else needs a signed,
 * time-bound token appended — either way the URL is directly clickable/downloadable,
 * no manual host prefixing required by the caller. */
async function getDownloadUrl(companyId, id) {
  const document = await getDocument(companyId, id);
  const base = `${env.appBaseUrl}${env.apiPrefix}/documents/${id}/download`;
  if (document.is_public) {
    return { url: base, expiresIn: null };
  }

  const token = jwt.sign({ documentId: id }, env.documents.signingSecret, {
    expiresIn: env.documents.presignedUrlExpiresIn,
  });
  return { url: `${base}?token=${token}`, expiresIn: env.documents.presignedUrlExpiresIn };
}

/** Authorizes the public download route: the token itself proves access to a private document. */
async function authorizeDownload(id, token) {
  const document = await documentRepository.findByIdUnscoped(id);
  if (!document) throw new AppError('DOC_001');
  if (document.is_public) return document;

  if (!token) throw new AppError('AUTH_004', [], 'A signed token is required to download this document.');
  try {
    const decoded = jwt.verify(token, env.documents.signingSecret);
    if (decoded.documentId !== id) throw new Error('mismatch');
  } catch (_err) {
    throw new AppError('AUTH_004', [], 'Download token is invalid or has expired.');
  }
  return document;
}

async function deleteDocument(companyId, id, actorId) {
  const deleted = await documentRepository.softDelete(companyId, id, actorId);
  if (!deleted) throw new AppError('DOC_001');
  await storageService.deleteFile(deleted.file_key);
}

module.exports = { uploadDocument, listDocuments, getDocument, getDownloadUrl, authorizeDownload, deleteDocument };
