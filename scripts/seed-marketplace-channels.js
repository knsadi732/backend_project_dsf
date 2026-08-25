/**
 * Seeds the 4 marketplace channels with the bootstrap-mode blended cost
 * assumptions the owner gave (all-in ₹/pair sold: courier + return/RTO-
 * weighted + ads + GST), plus the assumed CR/RTO split behind each, and the
 * target margin range per channel. These are editable defaults used by the
 * Pricing Calculator until real marketplace_settlements data can replace
 * them with an actual average (marketplaceSettlement.service.js).
 *
 * Usage: COMPANY_ID=<uuid> ACTOR_ID=<uuid> node scripts/seed-marketplace-channels.js
 */
const { pool } = require('../src/config/db');
const marketplaceChannelService = require('../src/services/marketplaceChannel.service');

const COMPANY_ID = process.env.COMPANY_ID;
const ACTOR_ID = process.env.ACTOR_ID;

if (!COMPANY_ID || !ACTOR_ID) {
  console.error('Usage: COMPANY_ID=<uuid> ACTOR_ID=<uuid> node scripts/seed-marketplace-channels.js');
  process.exit(1);
}

const CHANNELS = [
  {
    name: 'Meesho',
    defaultCommissionPercent: 0,
    defaultCostPerUnit: 130,
    assumedCustomerReturnPercent: 25,
    assumedRtoPercent: 5,
    marginMin: 60,
    marginMax: 100,
    remarks: 'Blended cost = courier + return(25%)/RTO(5%)-weighted + ads + GST, all-in per pair sold.',
  },
  {
    name: 'Flipkart',
    defaultCommissionPercent: 0,
    defaultCostPerUnit: 195,
    assumedCustomerReturnPercent: 20,
    assumedRtoPercent: 5,
    marginMin: 100,
    marginMax: 150,
    remarks: 'Blended cost = courier + return(20%)/RTO(5%)-weighted + ads + GST, all-in per pair sold.',
  },
  {
    name: 'Amazon',
    defaultCommissionPercent: 0,
    defaultCostPerUnit: 225,
    assumedCustomerReturnPercent: 20,
    assumedRtoPercent: 5,
    marginMin: 160,
    marginMax: 250,
    remarks: 'Blended cost = courier + return(20%)/RTO(5%)-weighted + ads + GST, all-in per pair sold.',
  },
  {
    name: 'Myntra',
    defaultCommissionPercent: 0,
    defaultCostPerUnit: 225,
    assumedCustomerReturnPercent: 20,
    assumedRtoPercent: 5,
    marginMin: 200,
    marginMax: 250,
    remarks: 'Blended cost = courier + return(20%)/RTO(5%)-weighted + ads + GST, all-in per pair sold.',
  },
];

async function main() {
  for (const channel of CHANNELS) {
    const created = await marketplaceChannelService.createChannel(COMPANY_ID, channel, ACTOR_ID);
    console.log(`Channel created: ${created.name} (${created.id}) — default cost ₹${created.default_cost_per_unit}/pair`);
  }
  await pool.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
