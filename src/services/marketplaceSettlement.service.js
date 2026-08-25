const AppError = require('../utils/AppError');
const { withTransaction } = require('../config/db');
const { buildPaginationMeta } = require('../utils/pagination');
const marketplaceSettlementRepository = require('../repositories/marketplaceSettlement.repository');
const marketplaceChannelRepository = require('../repositories/marketplaceChannel.repository');
const financeTransactionRepository = require('../repositories/financeTransaction.repository');

async function generateSettlementNumber() {
  return marketplaceSettlementRepository.peekSettlementNumber();
}

/**
 * Recording a settlement is real money landing in the account — post it to
 * the ledger the same way every other cash-moving action in this app does
 * (loan disbursement, payable payment, expense). netAmountReceived is what
 * actually hit the bank; commission/shipping/return/ads/TCS/TDS were already
 * netted off by the marketplace before it paid out, so only that final
 * figure is a real transaction — the individual deduction fields are cost
 * detail, not separate cash movements.
 */
async function recordSettlement(companyId, payload, actorId) {
  return withTransaction(async (client) => {
    const settlement = await marketplaceSettlementRepository.create(client, companyId, payload, actorId);

    if (Number(payload.netAmountReceived) > 0) {
      const channel = await marketplaceChannelRepository.findById(companyId, payload.channelId);
      await financeTransactionRepository.create(
        client,
        companyId,
        {
          transactionDate: payload.settlementDate,
          referenceType: 'marketplace_settlement',
          referenceId: settlement.id,
          direction: 'credit',
          amount: payload.netAmountReceived,
          orderId: payload.orderId || null,
          description: `Marketplace settlement — ${settlement.settlement_number} (${channel?.name ?? 'channel'})`,
        },
        actorId,
      );
    }

    return settlement;
  });
}

async function getSettlement(companyId, id) {
  const settlement = await marketplaceSettlementRepository.findById(companyId, id);
  if (!settlement) throw new AppError('SETTLEMENT_001');
  return settlement;
}

async function listSettlements(companyId, pagination, filters) {
  const { rows, totalRecords } = await marketplaceSettlementRepository.list(companyId, pagination, filters);
  return { rows, meta: buildPaginationMeta({ page: pagination.page, limit: pagination.limit, totalRecords }) };
}

function monthStartOf(date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

/**
 * Real actual-vs-assumed marketplace cost per channel for a given month —
 * the Stage-2 data that eventually replaces marketplace_channels'
 * default_cost_per_unit assumption in the Pricing Calculator (Chapter on
 * channel-wise Selling Price/MRP). Defaults to the current month.
 */
async function getMonthlyChannelCost(companyId, referenceDate = new Date()) {
  const monthStart = monthStartOf(referenceDate);
  const monthEnd = new Date(monthStart);
  monthEnd.setMonth(monthEnd.getMonth() + 1);
  return marketplaceSettlementRepository.summarizeByChannelForMonth(companyId, monthStart, monthEnd);
}

/** Per-product/category breakdown — see marketplaceSettlement.repository.js#summarizeByProductForMonth. */
async function getMonthlyProductCost(companyId, referenceDate = new Date()) {
  const monthStart = monthStartOf(referenceDate);
  const monthEnd = new Date(monthStart);
  monthEnd.setMonth(monthEnd.getMonth() + 1);
  return marketplaceSettlementRepository.summarizeByProductForMonth(companyId, monthStart, monthEnd);
}

module.exports = {
  generateSettlementNumber,
  recordSettlement,
  getSettlement,
  listSettlements,
  getMonthlyChannelCost,
  getMonthlyProductCost,
};
