const AppError = require('../utils/AppError');
const { withTransaction } = require('../config/db');
const { buildPaginationMeta } = require('../utils/pagination');
const { assertTransition } = require('../utils/stateMachine');
const { PURCHASE_REQUEST_STATUS, RFQ_STATUS, RFQ_STATUS_PIPELINE } = require('../constants/enums');
const rfqRepository = require('../repositories/rfq.repository');
const purchaseRequestRepository = require('../repositories/purchaseRequest.repository');
const vendorQuotationRepository = require('../repositories/vendorQuotation.repository');

/**
 * Raises an RFQ against an approved Purchase Request and sends it to one or
 * more vendors in the same transaction (plan.md 11.20: "Every PR must be
 * approved before an RFQ is raised against it"). The PR itself flips to
 * 'converted_to_rfq' immediately — mirrors how grnService.createGrnFromPurchaseOrder
 * fires inside transitionPurchaseOrder.
 */
async function createRfq(
  companyId,
  { branchId, purchaseRequestId, vendorIds, deliveryLocation, deliveryDate, paymentTerms, technicalSpecifications, remarks },
  actorId,
) {
  return withTransaction(async (client) => {
    const pr = await purchaseRequestRepository.findByIdForUpdate(client, companyId, purchaseRequestId);
    if (!pr) throw new AppError('PR_002');
    if (pr.status !== PURCHASE_REQUEST_STATUS.APPROVED) throw new AppError('RFQ_003');

    const rfq = await rfqRepository.create(
      client,
      companyId,
      { branchId: branchId ?? pr.branch_id, purchaseRequestId, deliveryLocation, deliveryDate, paymentTerms, technicalSpecifications, remarks },
      actorId,
    );
    await rfqRepository.addVendors(client, rfq.id, vendorIds);

    const updatedPr = await purchaseRequestRepository.updateStatus(client, purchaseRequestId, pr.version, PURCHASE_REQUEST_STATUS.CONVERTED_TO_RFQ, actorId);
    if (!updatedPr) throw new AppError('PR_001', [], 'Purchase request was modified concurrently — retry.');

    const vendors = await rfqRepository.findVendors(rfq.id, (text, params) => client.query(text, params));
    return { ...rfq, vendors };
  });
}

async function generateRfqNumber() {
  return rfqRepository.peekRfqNumber();
}

/** Full detail view: RFQ + its PR's material list + invited vendors + every quotation
 * received so far (the comparison payload — plan.md 11.20 "based on quotation comparison"). */
async function getRfq(companyId, id) {
  const rfq = await rfqRepository.findById(companyId, id);
  if (!rfq) throw new AppError('RFQ_002');

  const [materialItems, vendors, quotations] = await Promise.all([
    purchaseRequestRepository.findItems(rfq.purchase_request_id),
    rfqRepository.findVendors(rfq.id),
    vendorQuotationRepository.findByRfqId(companyId, rfq.id),
  ]);

  return { ...rfq, materialItems, vendors, quotations };
}

async function listRfqs(companyId, pagination, filters) {
  const { rows, totalRecords } = await rfqRepository.list(companyId, pagination, filters);
  return { rows, meta: buildPaginationMeta({ page: pagination.page, limit: pagination.limit, totalRecords }) };
}

/** Draft -> Sent: the RFQ has gone out to its invited vendors and can now start receiving quotations. */
async function sendRfq(companyId, id, actorId) {
  return withTransaction(async (client) => {
    const rfq = await rfqRepository.findByIdForUpdate(client, companyId, id);
    if (!rfq) throw new AppError('RFQ_002');
    assertTransition(RFQ_STATUS_PIPELINE, rfq.status, RFQ_STATUS.SENT, 'RFQ_001');

    const updated = await rfqRepository.updateStatus(client, id, rfq.version, RFQ_STATUS.SENT, actorId);
    if (!updated) throw new AppError('RFQ_001', [], 'RFQ was modified concurrently — retry.');
    return updated;
  });
}

/**
 * Vendor Selection (plan.md 11.20: "Vendor selection must be based on quotation
 * comparison"): pins the winning quotation, which purchaseOrder.service.js later
 * validates the PO's vendor against.
 */
async function selectVendor(companyId, id, vendorQuotationId, actorId) {
  return withTransaction(async (client) => {
    const rfq = await rfqRepository.findByIdForUpdate(client, companyId, id);
    if (!rfq) throw new AppError('RFQ_002');
    assertTransition(RFQ_STATUS_PIPELINE, rfq.status, RFQ_STATUS.VENDOR_SELECTED, 'RFQ_001');

    const quotation = await vendorQuotationRepository.findById(companyId, vendorQuotationId);
    if (!quotation || quotation.rfq_id !== id) throw new AppError('VQ_001');

    const updated = await rfqRepository.setSelectedQuotation(client, id, rfq.version, vendorQuotationId, actorId);
    if (!updated) throw new AppError('RFQ_001', [], 'RFQ was modified concurrently — retry.');
    return updated;
  });
}

/** Internal-only transition fired from purchaseOrder.service.js once a PO has been
 * created against this RFQ's selected vendor — not exposed via a route. */
async function markConvertedToPo(client, companyId, id, actorId) {
  const rfq = await rfqRepository.findByIdForUpdate(client, companyId, id);
  if (!rfq) throw new AppError('RFQ_002');
  assertTransition(RFQ_STATUS_PIPELINE, rfq.status, RFQ_STATUS.CONVERTED_TO_PO, 'RFQ_001');

  const updated = await rfqRepository.updateStatus(client, id, rfq.version, RFQ_STATUS.CONVERTED_TO_PO, actorId);
  if (!updated) throw new AppError('RFQ_001', [], 'RFQ was modified concurrently — retry.');
  return updated;
}

module.exports = { createRfq, generateRfqNumber, getRfq, listRfqs, sendRfq, selectVendor, markConvertedToPo };
