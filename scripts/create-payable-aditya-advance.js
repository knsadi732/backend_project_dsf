/**
 * One-off: records the ₹31,887 owner advance (Aditya Kumar Singh personally
 * funded 7 business expenses — see seed-owner-ledger.js / the 'advance'
 * funding source) as a proper Payable, so repayments to him can now be
 * tracked down to zero via /payables/:id/payments. The funding_sources
 * "Total Funded" figure has no repayment mechanism of its own — this Payable
 * is the trackable counterpart.
 *
 * Usage: COMPANY_ID=<uuid> ACTOR_ID=<uuid> node scripts/create-payable-aditya-advance.js
 */
const { pool } = require('../src/config/db');
const payableService = require('../src/services/payable.service');

const COMPANY_ID = process.env.COMPANY_ID;
const ACTOR_ID = process.env.ACTOR_ID;

if (!COMPANY_ID || !ACTOR_ID) {
  console.error('Usage: COMPANY_ID=<uuid> ACTOR_ID=<uuid> node scripts/create-payable-aditya-advance.js');
  process.exit(1);
}

async function main() {
  const payable = await payableService.createPayable(
    COMPANY_ID,
    {
      partyName: 'Aditya Kumar Singh',
      purpose: 'Owner Advance Reimbursement',
      totalAmount: 31887,
      remarks: 'Personally advanced for 7 business expenses in Aug 2026 (see funding_sources / seed-owner-ledger.js) — to be repaid.',
    },
    ACTOR_ID,
  );
  console.log(`Payable created: ${payable.id} (${payable.payable_number})`);
  await pool.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
