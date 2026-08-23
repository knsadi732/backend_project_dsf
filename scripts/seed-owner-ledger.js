/**
 * Replays the owner's manual spreadsheet ledger (DS Footwear, Aug 2026) through the
 * real quick-entry service path (financeService.quickEntry / recordExpense) — not raw
 * SQL — to prove the API records exactly what the spreadsheet does. Requires an
 * existing company + an actor user id; pass both as env vars.
 *
 * Usage: COMPANY_ID=<uuid> ACTOR_ID=<uuid> node scripts/seed-owner-ledger.js
 */
const { pool } = require('../src/config/db');
const financeService = require('../src/services/finance.service');

const COMPANY_ID = process.env.COMPANY_ID;
const ACTOR_ID = process.env.ACTOR_ID;

if (!COMPANY_ID || !ACTOR_ID) {
  console.error('Usage: COMPANY_ID=<uuid> ACTOR_ID=<uuid> node scripts/seed-owner-ledger.js');
  process.exit(1);
}

const ROWS = [
  {
    transactionDate: '2026-08-05',
    category: 'Business Setup Expense',
    description: 'Legal & Documentation - Rent Agreement + NOC preparation',
    amount: 700,
    partyName: 'Advocate Pintu',
    utrReference: '658388424411',
    paymentMode: 'upi',
    fundingType: 'advance',
    gst: { applicable: false },
  },
  {
    transactionDate: '2026-08-13',
    category: 'Business Setup Expense',
    description: 'GST Registration / Professional Fee - GST Registration service for DS Footwear',
    amount: 1500,
    partyName: 'CA/Consultant',
    utrReference: '659154486283',
    paymentMode: 'upi',
    fundingType: 'advance',
    gst: { applicable: false },
  },
  {
    transactionDate: '2026-08-16',
    category: 'Asset Purchase',
    description: 'Fixed Asset - Mobile Phone (8GB RAM / 128GB ROM)',
    amount: 22999,
    partyName: 'Mobile seller',
    utrReference: '622815318439',
    paymentMode: 'upi',
    fundingType: 'advance',
    gst: { applicable: true, taxableValue: 22999 - 3508.32, gstAmount: 3508.32, partyType: 'b2c' },
  },
  {
    transactionDate: '2026-08-19',
    category: 'Business Setup Expense',
    description: 'Legal & Documentation - Rent Agreement (Bill Not Available)',
    amount: 600,
    partyName: 'Aditya Kumar Singh',
    utrReference: '128163000000',
    paymentMode: 'upi',
    fundingType: 'advance',
    gst: { applicable: false },
  },
  {
    transactionDate: '2026-08-21',
    category: 'Asset Purchase',
    description: 'Fixed Asset - Printer (Pixra P30 Pro Thermal Label & Receipt Printer)',
    amount: 5604,
    partyName: 'Amazon / Clicktech Retail Private Ltd',
    utrReference: '407-4225917-9138725',
    paymentMode: 'credit_card',
    fundingType: 'advance',
    gst: { applicable: true, partyType: 'b2c' },
  },
  {
    transactionDate: '2026-08-21',
    category: 'Business Expense',
    description: 'Packaging / Label & Printing Material - Thermal Self-Adhesive Shipping Labels',
    amount: 304,
    partyName: 'Clicktech Retail Private Ltd',
    utrReference: '407-8817623-7861119',
    paymentMode: 'credit_card',
    fundingType: 'advance',
    gst: { applicable: true, partyType: 'b2c' },
  },
  {
    transactionDate: '2026-08-21',
    category: 'Business Expense',
    description: 'Office & Administrative / Printing & Stationery - Business Stamp/Seal Making',
    amount: 180,
    partyName: 'local shop',
    utrReference: '128281000000',
    paymentMode: 'upi',
    fundingType: 'advance',
    gst: { applicable: false },
  },
];

async function main() {
  const fundingSource = await financeService.createFundingSource(
    COMPANY_ID,
    { partyName: 'Aditya Kumar Singh', partyType: 'individual', defaultFundingType: 'advance', contactInfo: null },
    ACTOR_ID,
  );
  console.log(`Funding source created: ${fundingSource.id}`);

  for (const row of ROWS) {
    const expense = await financeService.recordExpense(
      COMPANY_ID,
      {
        category: row.category,
        amount: row.amount,
        description: row.description,
        transactionDate: row.transactionDate,
        partyName: row.partyName,
        utrReference: row.utrReference,
        paymentMode: row.paymentMode,
        fundingSourceId: fundingSource.id,
        fundingType: row.fundingType,
        paidReceivedBy: ACTOR_ID,
        gstApplicable: row.gst.applicable,
        gstAmount: row.gst.gstAmount,
        gstDetail: row.gst,
      },
      ACTOR_ID,
    );
    console.log(`Recorded expense ${expense.id}: ${row.category} - ${row.amount}`);
  }

  await pool.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
