const gstReportRepository = require('../repositories/gstReport.repository');
const fixedAssetService = require('./fixedAsset.service');
const { estimateIncomeTax } = require('../utils/incomeTax');

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

  // Fixed Asset purchases are capitalized, not expensed (excluded from `rows` above by
  // getCategoryTotals) — only their depreciation-to-date is a real period expense.
  // Their remaining value belongs on a Balance Sheet, not the P&L — surfaced here as
  // fixedAssetsSummary so "what does the company own" is still answerable from this report.
  const { rows: assets } = await fixedAssetService.listAssets(companyId, { page: 1, limit: 1000, offset: 0, search: '' }, {});
  const activeAssets = assets.filter((asset) => asset.status !== 'disposed');
  const depreciation = activeAssets.reduce((total, asset) => total + Number(asset.accumulated_depreciation || 0), 0);
  if (depreciation > 0) {
    categories.Depreciation = { credit: 0, debit: depreciation };
    totalExpenses += depreciation;
  }

  const fixedAssetsSummary = {
    totalCost: activeAssets.reduce((total, asset) => total + Number(asset.purchase_cost || 0), 0),
    totalAccumulatedDepreciation: depreciation,
    netBookValue: activeAssets.reduce((total, asset) => total + Number(asset.net_book_value || 0), 0),
    assets: activeAssets.map((asset) => ({
      assetTag: asset.asset_tag,
      assetName: asset.asset_name,
      purchaseCost: Number(asset.purchase_cost),
      accumulatedDepreciation: Number(asset.accumulated_depreciation),
      netBookValue: Number(asset.net_book_value),
    })),
  };

  const netProfit = totalSales - totalExpenses;
  const newRegime = estimateIncomeTax(netProfit, 'new');
  const oldRegime = estimateIncomeTax(netProfit, 'old');
  const recommendedRegime = newRegime.totalTax <= oldRegime.totalTax ? 'new' : 'old';

  return {
    period,
    categories,
    totalSales,
    totalExpenses,
    netProfit,
    fixedAssetsSummary,
    estimatedIncomeTax: {
      newRegime,
      oldRegime,
      recommendedRegime,
      disclaimer:
        'Estimated from this business\'s Net Profit only, using FY 2026-27 individual slab rates (Section 87A rebate + 4% cess applied, surcharge not modeled). ' +
        'Does not account for the proprietor\'s other income, deductions (80C etc., old regime only), or advance tax already paid — confirm with your CA before filing.',
    },
  };
}

module.exports = { getGstr1Summary, getGstr3bSummary, getGstr2bProxy, getProfitAndLoss };
