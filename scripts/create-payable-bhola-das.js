/**
 * One-off: records the ₹40,000 rent deposit owed to Bhola Das as a payable —
 * due now, unpaid, to be settled down via monthly ₹5,000 rent adjustments
 * starting September 2026 (recorded separately via /payables/:id/payments
 * as each month's rent is actually adjusted).
 *
 * Usage: COMPANY_ID=<uuid> ACTOR_ID=<uuid> node scripts/create-payable-bhola-das.js
 */
const { pool } = require('../src/config/db');
const payableService = require('../src/services/payable.service');

const COMPANY_ID = process.env.COMPANY_ID;
const ACTOR_ID = process.env.ACTOR_ID;

if (!COMPANY_ID || !ACTOR_ID) {
  console.error('Usage: COMPANY_ID=<uuid> ACTOR_ID=<uuid> node scripts/create-payable-bhola-das.js');
  process.exit(1);
}

async function main() {
  const payable = await payableService.createPayable(
    COMPANY_ID,
    {
      partyName: 'Bhola Das',
      purpose: 'Rent Deposit',
      totalAmount: 40000,
      remarks: 'Due — to be adjusted against monthly rent (₹5,000/month) starting September 2026.',
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
