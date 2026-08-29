const AppError = require('../utils/AppError');
const { withTransaction } = require('../config/db');
const { buildPaginationMeta } = require('../utils/pagination');
const grnRepository = require('../repositories/grn.repository');
const purchaseOrderRepository = require('../repositories/purchaseOrder.repository');
const documentRepository = require('../repositories/document.repository');
const documentService = require('./document.service');
const storageService = require('./storage.service');
const vendorBillService = require('./vendorBill.service');

/** Resolves vendor_invoice_document_id into a ready-to-use, pre-signed download URL —
 * callers should never need the raw document id. */
async function attachInvoiceUrl(companyId, grn) {
  if (!grn.vendor_invoice_document_id) return grn;
  const { url } = await documentService.getDownloadUrl(companyId, grn.vendor_invoice_document_id);
  return { ...grn, vendor_invoice_url: url };
}

/**
 * Auto-generates the GRN for a Purchase Order the moment it reaches 'completed'
 * (plan.md Chapter 11: PO -> GRN -> Inventory). Called from within the same
 * transaction as the PO status transition, so the GRN and the PO completion
 * commit atomically. Stock was already added to Inventory earlier, at the
 * 'partially_received' transition — this only records the receipt document.
 */
async function createGrnFromPurchaseOrder(client, companyId, po, actorId) {
  const items = await purchaseOrderRepository.findItems(po.id);

  const grn = await grnRepository.create(
    client,
    companyId,
    {
      branchId: po.branch_id,
      warehouseId: po.warehouse_id,
      vendorId: po.vendor_id,
      purchaseOrderId: po.id,
      remarks: `Auto-generated on completion of purchase order ${po.po_number}.`,
    },
    actorId,
  );

  await grnRepository.createItems(
    client,
    grn.id,
    items.map((item) => ({
      purchaseOrderItemId: item.id,
      productVariantId: item.product_variant_id,
      itemVariantId: item.item_variant_id,
      orderedQuantity: item.quantity,
      receivedQuantity: item.quantity,
      unitCost: item.unit_cost,
    })),
  );

  await vendorBillService.createFromGrn(client, companyId, grn, po, actorId);

  return grn;
}

async function getGrn(companyId, id) {
  const grn = await grnRepository.findById(companyId, id);
  if (!grn) throw new AppError('GRN_001');
  const items = await grnRepository.findItems(id);
  return attachInvoiceUrl(companyId, { ...grn, items });
}

async function listGrns(companyId, pagination, filters) {
  const { rows, totalRecords } = await grnRepository.list(companyId, pagination, filters);
  const withUrls = await Promise.all(rows.map((row) => attachInvoiceUrl(companyId, row)));
  return { rows: withUrls, meta: buildPaginationMeta({ page: pagination.page, limit: pagination.limit, totalRecords }) };
}

/** Uploads the vendor's invoice for a GRN, identified by its human-readable grn_number:
 * files it under the shared Document Management store (entity_type = 'invoice') AND
 * stamps grns.vendor_invoice_document_id, so the GRN row itself reflects the upload. */
async function uploadInvoice(companyId, grnNumber, file, actorId) {
  const grn = await grnRepository.findByGrnNumber(companyId, grnNumber);
  if (!grn) throw new AppError('GRN_001');

  const fileKey = await storageService.saveFile({ companyId, buffer: file.buffer, originalName: file.originalname });

  const updatedGrn = await withTransaction(async (client) => {
    const document = await documentRepository.create(
      companyId,
      {
        branchId: grn.branch_id,
        warehouseId: grn.warehouse_id,
        entityType: 'invoice',
        entityId: grn.id,
        fileKey,
        fileName: file.originalname,
        mimeType: file.mimetype,
        sizeBytes: file.size,
        isPublic: false,
      },
      actorId,
      (text, params) => client.query(text, params),
    );

    return grnRepository.updateVendorInvoice(client, companyId, grn.id, document.id);
  });

  return attachInvoiceUrl(companyId, updatedGrn);
}

module.exports = { createGrnFromPurchaseOrder, getGrn, listGrns, uploadInvoice };
