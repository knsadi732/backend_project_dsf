/**
 * One-off: files the DS Footwear GST registration certificate and Udyam registration
 * certificate into the documents module against the company record, through the real
 * documentService.uploadDocument path (not a raw insert).
 *
 * Usage: COMPANY_ID=<uuid> ACTOR_ID=<uuid> node scripts/upload-company-documents.js
 */
const fs = require('fs');
const path = require('path');
const { pool } = require('../src/config/db');
const documentService = require('../src/services/document.service');

const COMPANY_ID = process.env.COMPANY_ID;
const ACTOR_ID = process.env.ACTOR_ID;

if (!COMPANY_ID || !ACTOR_ID) {
  console.error('Usage: COMPANY_ID=<uuid> ACTOR_ID=<uuid> node scripts/upload-company-documents.js');
  process.exit(1);
}

const FILES = [
  { filePath: 'E:\\DS Footwear\\DS Footwear_GST.pdf', entityType: 'gst_certificate' },
  { filePath: 'E:\\DS Footwear\\DS Footwear_udyam.pdf', entityType: 'udyam_certificate' },
];

async function main() {
  for (const { filePath, entityType } of FILES) {
    const buffer = fs.readFileSync(filePath);
    const originalname = path.basename(filePath);
    const doc = await documentService.uploadDocument(
      COMPANY_ID,
      {
        entityType,
        entityId: COMPANY_ID,
        isPublic: false,
        file: { buffer, originalname, mimetype: 'application/pdf', size: buffer.length },
      },
      ACTOR_ID,
    );
    console.log(`Uploaded ${entityType}: ${doc.id} (${doc.file_name})`);
  }
  await pool.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
