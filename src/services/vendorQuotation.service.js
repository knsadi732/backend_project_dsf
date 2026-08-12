const AppError = require('../utils/AppError');
const { withTransaction } = require('../config/db');
const { RFQ_STATUS } = require('../constants/enums');
const rfqRepository = require('../repositories/rfq.repository');
const vendorQuotationRepository = require('../repositories/vendorQuotation.repository');

/**
 * Records one vendor's response to an RFQ (plan.md 11.20: "Every quotation must
 * reference a valid RFQ"). Only accepted once the RFQ has been sent, and only for
 * a vendor it was actually sent to. The RFQ's first quotation flips it Sent -> Quoted.
 */
async function recordVendorQuotation(
  companyId,
  { rfqId, vendorId, items, deliveryTimeDays, paymentTerms, validityDate, freightAmount, discountAmount, remarks },
  actorId,
) {
  return withTransaction(async (client) => {
    const rfq = await rfqRepository.findByIdForUpdate(client, companyId, rfqId);
    if (!rfq) throw new AppError('RFQ_002');
    if (![RFQ_STATUS.SENT, RFQ_STATUS.QUOTED].includes(rfq.status)) throw new AppError('RFQ_004');

    const invited = await rfqRepository.isVendorInvited(client, rfqId, vendorId);
    if (!invited) throw new AppError('RFQ_004', [], 'This vendor was not sent this RFQ.');

    let quotation;
    try {
      quotation = await vendorQuotationRepository.create(
        client,
        companyId,
        { rfqId, vendorId, deliveryTimeDays, paymentTerms, validityDate, freightAmount, discountAmount, remarks },
        actorId,
      );
    } catch (err) {
      if (err.code === '23505') throw new AppError('VQ_002');
      throw err;
    }
    await vendorQuotationRepository.createItems(client, quotation.id, items);

    if (rfq.status === RFQ_STATUS.SENT) {
      await rfqRepository.updateStatus(client, rfqId, rfq.version, RFQ_STATUS.QUOTED, actorId);
    }

    const createdItems = await vendorQuotationRepository.findItems(quotation.id, (text, params) => client.query(text, params));
    return { ...quotation, items: createdItems };
  });
}

module.exports = { recordVendorQuotation };
