/**
 * Individual income-tax slab computation, FY 2026-27 (AY 2027-28) — confirmed
 * unchanged from Budget 2026 (multiple sources, checked Aug 2026). Business income
 * from a proprietorship is taxed in the proprietor's hands under these same
 * individual slabs — there is no separate "business tax rate".
 *
 * New regime is the default regime for AY 2027-28. Surcharge (kicks in only above
 * ₹50 lakh total income) is intentionally NOT implemented — out of scope for a
 * small business at this income level; revisit if income grows past that.
 */
const NEW_REGIME_SLABS = [
  { upto: 400000, rate: 0 },
  { upto: 800000, rate: 0.05 },
  { upto: 1200000, rate: 0.1 },
  { upto: 1600000, rate: 0.15 },
  { upto: 2000000, rate: 0.2 },
  { upto: 2400000, rate: 0.25 },
  { upto: Infinity, rate: 0.3 },
];
const NEW_REGIME_REBATE_LIMIT = 1200000; // Section 87A: taxable income up to ₹12L pays zero tax
const NEW_REGIME_REBATE_MAX = 60000;

const OLD_REGIME_SLABS = [
  { upto: 250000, rate: 0 },
  { upto: 500000, rate: 0.05 },
  { upto: 1000000, rate: 0.2 },
  { upto: Infinity, rate: 0.3 },
];
const OLD_REGIME_REBATE_LIMIT = 500000;
const OLD_REGIME_REBATE_MAX = 12500;

const CESS_RATE = 0.04; // Health & Education Cess, both regimes

function slabTax(taxableIncome, slabs) {
  let tax = 0;
  let lastCap = 0;
  for (const { upto, rate } of slabs) {
    if (taxableIncome <= lastCap) break;
    const bandAmount = Math.min(taxableIncome, upto) - lastCap;
    tax += bandAmount * rate;
    lastCap = upto;
  }
  return tax;
}

/**
 * @param {number} taxableIncome - net business profit (no standard deduction applies
 *   here — that's salary/pension-only; a proprietor's business income gets none).
 * @param {'new'|'old'} regime
 */
function estimateIncomeTax(taxableIncome, regime = 'new') {
  const income = Math.max(taxableIncome, 0);
  const slabs = regime === 'old' ? OLD_REGIME_SLABS : NEW_REGIME_SLABS;
  const rebateLimit = regime === 'old' ? OLD_REGIME_REBATE_LIMIT : NEW_REGIME_REBATE_LIMIT;
  const rebateMax = regime === 'old' ? OLD_REGIME_REBATE_MAX : NEW_REGIME_REBATE_MAX;

  const fullSlabTax = slabTax(income, slabs);
  let taxAfterRebate;
  if (income <= rebateLimit) {
    // Section 87A: rebate = min(tax payable, rebateMax) — wipes tax entirely up to this limit.
    taxAfterRebate = Math.max(fullSlabTax - Math.min(fullSlabTax, rebateMax), 0);
  } else {
    // Marginal relief: just above the rebate limit, tax payable is capped at the
    // income excess over the limit, so a ₹1 increase in income never costs more
    // than ₹1 in extra tax (avoids the cliff a naive rebate cutoff would create).
    const excessOverLimit = income - rebateLimit;
    taxAfterRebate = fullSlabTax > excessOverLimit ? excessOverLimit : fullSlabTax;
  }
  const cess = taxAfterRebate * CESS_RATE;

  return {
    regime,
    taxableIncome: income,
    taxBeforeCess: Math.round(taxAfterRebate),
    cess: Math.round(cess),
    totalTax: Math.round(taxAfterRebate + cess),
  };
}

module.exports = { estimateIncomeTax };
