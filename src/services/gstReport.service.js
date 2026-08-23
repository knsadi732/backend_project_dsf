const gstReportRepository = require('../repositories/gstReport.repository');

/**
 * GSTR-1: outward supplies. HSN/rate-wise summary plus a B2B invoice-wise
 * breakdown (the B2B section of the real return needs per-invoice buyer GSTIN).
 */
async function getGstr1Summary(companyId, period = {}) {
  const [hsnRateSummary, b2bInvoices] = await Promise.all([
    gstReportRepository.getOutwardSummary(companyId, period),
    gstReportRepository.getB2bInvoices(companyId, period),
  ]);
  const b2cSummary = hsnRateSummary.filter((r) => r.party_type === 'b2c');
  const b2bSummary = hsnRateSummary.filter((r) => r.party_type === 'b2b');
  return { period, hsnRateSummary, b2bSummary, b2cSummary, b2bInvoices };
}

/** GSTR-3B: consolidated summary — outward tax liability minus eligible ITC. */
async function getGstr3bSummary(companyId, period = {}) {
  const [outward, inward] = await Promise.all([
    gstReportRepository.getOutwardSummary(companyId, period),
    gstReportRepository.getInwardSummary(companyId, period),
  ]);

  const sumField = (rows, field) => rows.reduce((total, row) => total + Number(row[field]), 0);
  const outwardTaxableValue = sumField(outward, 'taxable_value');
  const outputTax = sumField(outward, 'cgst_amount') + sumField(outward, 'sgst_amount') + sumField(outward, 'igst_amount');
  const itcClaimed = inward.reduce((total, row) => total + Number(row.cgst_amount) + Number(row.sgst_amount) + Number(row.igst_amount), 0);

  return {
    period,
    outwardTaxableValue,
    outputTax,
    itcClaimed,
    netTaxPayable: Math.max(outputTax - itcClaimed, 0),
  };
}

/**
 * GSTR-2B proxy: purchase/expense entries flagged GST-applicable. This is NOT the
 * GSTN-auto-drafted 2B — that is compiled by the government portal from suppliers'
 * own GSTR-1 filings and cannot be reproduced without a GSTN API integration. Treat
 * this as "ITC eligible per entries recorded here" and reconcile against the actual
 * portal-downloaded 2B before filing.
 */
async function getGstr2bProxy(companyId, period = {}) {
  const rows = await gstReportRepository.getInwardSummary(companyId, period);
  return {
    period,
    rows,
    disclaimer:
      'This is an internal proxy built from purchase/expense entries recorded in this system, ' +
      'not the GSTN-reconciled GSTR-2B. Cross-check against the portal-downloaded GSTR-2B before filing.',
  };
}

/** Total Sales − Total Expenses = Net Profit, category-wise, for ITR/CA reference. */
async function getProfitAndLoss(companyId, period = {}) {
  const rows = await gstReportRepository.getCategoryTotals(companyId, period);
  const categories = {};
  let totalSales = 0;
  let totalExpenses = 0;

  for (const row of rows) {
    const amount = Number(row.total);
    categories[row.category] = categories[row.category] || { credit: 0, debit: 0 };
    categories[row.category][row.direction] = amount;
    if (row.direction === 'credit') totalSales += amount;
    else totalExpenses += amount;
  }

  return { period, categories, totalSales, totalExpenses, netProfit: totalSales - totalExpenses };
}

module.exports = { getGstr1Summary, getGstr3bSummary, getGstr2bProxy, getProfitAndLoss };
