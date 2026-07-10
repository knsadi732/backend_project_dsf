const fs = require('fs');
const fsp = require('fs/promises');
const path = require('path');
const crypto = require('crypto');
const env = require('../config/env');

/**
 * Local-disk storage adapter behind the same interface a cloud bucket driver
 * would expose (save/read/delete by key), so swapping to S3-compatible
 * storage later only touches this file (plan.md Service-04).
 */
async function saveFile({ companyId, buffer, originalName }) {
  const safeName = originalName.replace(/[^a-zA-Z0-9_.-]/g, '_');
  const fileKey = path.posix.join(companyId, `${crypto.randomUUID()}-${safeName}`);
  const destPath = path.join(env.documents.storageRoot, fileKey);

  await fsp.mkdir(path.dirname(destPath), { recursive: true });
  await fsp.writeFile(destPath, buffer);

  return fileKey;
}

function readFileStream(fileKey) {
  return fs.createReadStream(path.join(env.documents.storageRoot, fileKey));
}

async function deleteFile(fileKey) {
  await fsp.rm(path.join(env.documents.storageRoot, fileKey), { force: true });
}

module.exports = { saveFile, readFileStream, deleteFile };
