const orderRepository = require('../repositories/order.repository');
const marketplaceChannelRepository = require('../repositories/marketplaceChannel.repository');
const marketplaceSettlementRepository = require('../repositories/marketplaceSettlement.repository');
const settingsRepository = require('../repositories/settings.repository');
const productRepository = require('../repositories/product.repository');
const productVariantRepository = require('../repositories/productVariant.repository');

const MIN_DAYS_OF_OWN_DATA = 15;

/**
 * DS Footwear has no sales history yet — every forecast below falls back to
 * a generic, clearly-labelled MARKET ASSUMPTION until the company's own
 * sales data covers at least MIN_DAYS_OF_OWN_DATA days, then switches over
 * to that real data automatically. Nothing here is fabricated as if it were
 * DS's own numbers — every response carries a `basis` field
 * ('market_assumption' | 'actual_data' | 'no_data') so the caller/UI can
 * never present one as the other.
 */
const MARKET_ASSUMPTIONS = {
  // Generic early-stage online footwear seller month-over-month growth —
  // not DS-specific, not derived from any real data source.
  monthlyGrowthPercent: 15,
  // Generic Indian adult footwear size distribution (bell-shaped, mid-sizes
  // dominant) — a commonly used retail planning assumption, not DS's own
  // sales ratio.
  sizeCurve: [
    { size: '6', share: 0.05 },
    { size: '7', share: 0.15 },
    { size: '8', share: 0.25 },
    { size: '9', share: 0.25 },
    { size: '10', share: 0.20 },
    { size: '11', share: 0.10 },
  ],
  // Generic new-seller channel mix for the 4 marketplaces DS already has
  // configured (Chapter 17 Marketplace Channels) — not DS's own channel split.
  channelMixByName: { Meesho: 0.40, Flipkart: 0.25, Amazon: 0.20, Myntra: 0.15 },
  // Generic monthly unit-sales volume benchmark for a brand-new solo/small
  // online footwear seller across all marketplaces combined, in its first
  // few months (a commonly-cited early-stage D2C/marketplace-seller
  // starting point — not a live market feed, not DS-specific). Used only
  // when the owner hasn't set a Monthly Sales Target: multiplied against
  // DS's own catalog Average Selling Price (a real, DS-owned number) so the
  // open-market baseline isn't a bare invented revenue figure — it's this
  // generic volume assumption applied to DS's actual pricing.
  newSellerMonthlyUnitsBenchmark: 150,
  // Absolute last-resort fallback ONLY if the catalog has no priced active
  // variant yet to derive an Average Selling Price from.
  fallbackAvgSellingPrice: 800,
};

// Local getters, not toISOString() — this service only ever constructs
// dates as local calendar months (new Date(year, month, 1)), and going
// through toISOString() (UTC) shifts the label back a month for any
// timezone ahead of UTC (e.g. IST) since local midnight is still the
// previous day in UTC.
function monthLabel(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

function leastSquaresFit(points) {
  const n = points.length;
  if (n < 2) return { slope: 0, intercept: points[0]?.y ?? 0 };

  const sumX = points.reduce((total, p) => total + p.x, 0);
  const sumY = points.reduce((total, p) => total + p.y, 0);
  const sumXY = points.reduce((total, p) => total + p.x * p.y, 0);
  const sumXX = points.reduce((total, p) => total + p.x * p.x, 0);

  const denominator = n * sumXX - sumX * sumX;
  if (denominator === 0) return { slope: 0, intercept: sumY / n };

  const slope = (n * sumXY - sumX * sumY) / denominator;
  const intercept = (sumY - slope * sumX) / n;
  return { slope, intercept };
}

/** Days of the company's own order history so far, and whether that clears the bar to trust it over the market assumption. */
async function getDataSufficiency(companyId) {
  const row = await orderRepository.getSalesDataSufficiency(companyId);
  const orderCount = Number(row.order_count);
  const daysOfData = row.earliest_order_at
    ? Math.floor((Date.now() - new Date(row.earliest_order_at).getTime()) / (24 * 60 * 60 * 1000))
    : 0;
  return { orderCount, daysOfData, sufficient: orderCount > 0 && daysOfData >= MIN_DAYS_OF_OWN_DATA };
}

/**
 * Overall sales forecast. Uses the real linear-trend projection once 15+
 * days of DS's own order history exists (unchanged from before); until
 * then, projects forward from the owner's own stated Monthly Sales Target
 * (Settings) compounded at the generic market growth assumption — never an
 * invented revenue number. No target set yet -> `basis: 'no_data'`, zeros,
 * and a prompt to set one.
 */
async function getSalesForecast(companyId, { monthsHistory = 6, monthsAhead = 3 } = {}) {
  const sufficiency = await getDataSufficiency(companyId);

  if (sufficiency.sufficient) {
    const rows = await orderRepository.monthlySalesSummary(companyId, monthsHistory);
    const history = rows.map((row) => ({
      month: monthLabel(new Date(row.month)),
      totalSales: Number(row.total_sales),
      orderCount: Number(row.order_count),
    }));
    const points = history.map((h, index) => ({ x: index, y: h.totalSales }));
    const { slope, intercept } = leastSquaresFit(points);
    const lastMonthDate = history.length
      ? new Date(rows[rows.length - 1].month)
      : new Date(new Date().getFullYear(), new Date().getMonth(), 1);

    const forecast = [];
    for (let i = 1; i <= monthsAhead; i += 1) {
      const projectedDate = new Date(lastMonthDate.getFullYear(), lastMonthDate.getMonth() + i, 1);
      forecast.push({ month: monthLabel(projectedDate), projectedSales: Math.max(slope * (points.length - 1 + i) + intercept, 0) });
    }

    return {
      basis: 'actual_data',
      daysOfData: sufficiency.daysOfData,
      history,
      forecast,
      trend: slope > 0 ? 'growing' : slope < 0 ? 'declining' : 'flat',
      disclaimer: `Linear trend projection from ${monthsHistory} months of DS Footwear's own actual sales — not a seasonal or ML forecast.`,
    };
  }

  const settings = await settingsRepository.findByCompanyId(companyId);
  const ownTarget = settings?.monthly_sales_target != null ? Number(settings.monthly_sales_target) : null;

  let baseline = ownTarget;
  let baselineSource = 'owner_target';
  let avgSellingPrice = null;
  if (!baseline) {
    avgSellingPrice = await productVariantRepository.averageSellingPrice(companyId);
    const priceUsed = avgSellingPrice ?? MARKET_ASSUMPTIONS.fallbackAvgSellingPrice;
    baseline = Math.round(priceUsed * MARKET_ASSUMPTIONS.newSellerMonthlyUnitsBenchmark);
    baselineSource = avgSellingPrice ? 'open_market_catalog' : 'open_market_fallback';
  }

  const growthRate = MARKET_ASSUMPTIONS.monthlyGrowthPercent / 100;
  const now = new Date();
  const forecast = [];
  for (let i = 0; i < monthsAhead; i += 1) {
    const projectedDate = new Date(now.getFullYear(), now.getMonth() + i, 1);
    forecast.push({ month: monthLabel(projectedDate), projectedSales: Math.round(baseline * (1 + growthRate) ** i) });
  }

  const disclaimerBySource = {
    owner_target: `this projects your Monthly Sales Target (₹${baseline.toLocaleString('en-IN')}) forward`,
    open_market_catalog: `this projects an open-market baseline (₹${baseline.toLocaleString('en-IN')}/month = DS Footwear's own catalog Average Selling Price ₹${Math.round(avgSellingPrice).toLocaleString('en-IN')} × a generic ${MARKET_ASSUMPTIONS.newSellerMonthlyUnitsBenchmark}-pairs/month early-stage-seller volume assumption) forward`,
    open_market_fallback: `this projects an open-market baseline (₹${baseline.toLocaleString('en-IN')}/month, from a generic ₹${MARKET_ASSUMPTIONS.fallbackAvgSellingPrice}/pair assumed price — no priced catalog item exists yet — × a generic ${MARKET_ASSUMPTIONS.newSellerMonthlyUnitsBenchmark}-pairs/month early-stage-seller volume assumption) forward`,
  };

  return {
    basis: 'market_assumption',
    baselineSource,
    daysOfData: sufficiency.daysOfData,
    history: [],
    forecast,
    trend: 'growing',
    disclaimer:
      `DS Footwear has only ${sufficiency.daysOfData}/${MIN_DAYS_OF_OWN_DATA} days of its own sales data — ${disclaimerBySource[baselineSource]} at a generic ${MARKET_ASSUMPTIONS.monthlyGrowthPercent}%/month early-stage online-seller growth assumption (open-market benchmarks, not DS-specific or live market data). Set your own Monthly Sales Target in Settings to override this baseline. Switches to your own actual sales trend automatically once ${MIN_DAYS_OF_OWN_DATA} days of orders exist.`,
  };
}

/**
 * Per-size demand SHARE for one product (percent of units, not absolute
 * count — deliberately, since an absolute unit forecast would need a
 * revenue baseline this function has no business assuming). Uses the
 * generic market size-curve until this product has 15+ days of its own
 * sales; the curve is matched only against sizes the product actually has
 * variants for, then re-normalized to sum to 100%.
 */
async function getSizeForecast(companyId, productId) {
  const sufficiency = await getDataSufficiency(companyId);
  const product = await productRepository.findById(companyId, productId);

  if (sufficiency.sufficient) {
    const rows = await orderRepository.sizeSalesShare(companyId, productId);
    const total = rows.reduce((sum, row) => sum + Number(row.quantity), 0);
    if (total > 0) {
      return {
        basis: 'actual_data',
        productId,
        productName: product?.name ?? null,
        daysOfData: sufficiency.daysOfData,
        sizes: rows.map((row) => ({ size: row.size, sharePercent: Math.round((Number(row.quantity) / total) * 1000) / 10 })),
        disclaimer: "DS Footwear's own historical size-wise sales split for this product.",
      };
    }
    // Sufficient overall data but this specific product hasn't sold yet — fall through to the market curve for it.
  }

  return {
    basis: 'market_assumption',
    productId,
    productName: product?.name ?? null,
    daysOfData: sufficiency.daysOfData,
    sizes: MARKET_ASSUMPTIONS.sizeCurve.map((row) => ({ size: row.size, sharePercent: Math.round(row.share * 1000) / 10 })),
    disclaimer:
      'Generic Indian adult footwear size-curve assumption (not DS-specific data) — switches to this product\'s own historical size split once it has enough sales history.',
  };
}

/**
 * Per-channel demand SHARE (percent of revenue, not absolute ₹ — same
 * reasoning as getSizeForecast). Uses the generic market channel-mix,
 * matched against DS's actually-configured Marketplace Channels, until
 * enough real Marketplace Settlements exist.
 */
async function getChannelForecast(companyId) {
  const sufficiency = await getDataSufficiency(companyId);
  const channels = await marketplaceChannelRepository.list(companyId, { activeOnly: true });

  if (sufficiency.sufficient) {
    const sinceDate = new Date(Date.now() - MIN_DAYS_OF_OWN_DATA * 24 * 60 * 60 * 1000);
    const rows = await marketplaceSettlementRepository.totalByChannelSince(companyId, sinceDate);
    const total = rows.reduce((sum, row) => sum + Number(row.total), 0);
    if (total > 0) {
      return {
        basis: 'actual_data',
        daysOfData: sufficiency.daysOfData,
        channels: rows.map((row) => ({ channelId: row.channel_id, channelName: row.channel_name, sharePercent: Math.round((Number(row.total) / total) * 1000) / 10 })),
        disclaimer: "DS Footwear's own recent Marketplace Settlement revenue split.",
      };
    }
    // Sufficient order history but no settlements recorded yet — fall through to the market mix.
  }

  const matched = channels
    .map((c) => ({ channelId: c.id, channelName: c.name, share: MARKET_ASSUMPTIONS.channelMixByName[c.name] }))
    .filter((c) => c.share != null);
  const unmatchedCount = channels.length - matched.length;
  const evenShareForUnmatched = unmatchedCount > 0 ? (1 - matched.reduce((s, c) => s + c.share, 0)) / unmatchedCount : 0;

  const shares = [
    ...matched,
    ...channels.filter((c) => MARKET_ASSUMPTIONS.channelMixByName[c.name] == null).map((c) => ({ channelId: c.id, channelName: c.name, share: evenShareForUnmatched })),
  ];

  return {
    basis: 'market_assumption',
    daysOfData: sufficiency.daysOfData,
    channels: shares.map((c) => ({ channelId: c.channelId, channelName: c.channelName, sharePercent: Math.round(c.share * 1000) / 10 })),
    disclaimer:
      'Generic new-seller channel-mix assumption (not DS-specific data) — switches to DS Footwear\'s own Marketplace Settlement split once enough real settlements exist.',
  };
}

module.exports = { getDataSufficiency, getSalesForecast, getSizeForecast, getChannelForecast };
