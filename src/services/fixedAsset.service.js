const AppError = require('../utils/AppError');
const { withTransaction } = require('../config/db');
const { buildPaginationMeta } = require('../utils/pagination');
const fixedAssetRepository = require('../repositories/fixedAsset.repository');
const fixedAssetAssignmentRepository = require('../repositories/fixedAssetAssignment.repository');
const fixedAssetMaintenanceRepository = require('../repositories/fixedAssetMaintenance.repository');
const itemRepository = require('../repositories/item.repository');
const financeService = require('./finance.service');

const DAY_MS = 24 * 60 * 60 * 1000;
const INDIA_FY_START_MONTH = 3; // April, 0-indexed (Jan = 0)
const HALF_YEAR_USE_THRESHOLD_DAYS = 180; // Income Tax Act s.32: <180 days used in the year of purchase => half rate

/** 1 April on-or-before `date`'s own financial year. */
function fyStartFor(date) {
  const d = new Date(date);
  const year = d.getMonth() >= INDIA_FY_START_MONTH ? d.getFullYear() : d.getFullYear() - 1;
  return new Date(year, INDIA_FY_START_MONTH, 1);
}

/** Exclusive FY end — the 1 April that starts the NEXT financial year. */
function fyEndFor(fyStart) {
  return new Date(fyStart.getFullYear() + 1, INDIA_FY_START_MONTH, 1);
}

/**
 * Net Book Value is always derived, never stored (same pattern as loans.repository.js's
 * outstanding-balance-from-repayments — see loan.service.js).
 *
 * Depreciation is booked ONE FULL FINANCIAL YEAR AT A TIME (1 Apr - 31 Mar), not
 * prorated by the day — the same convention a CA uses when filing (Income Tax
 * Act s.32, WDV block-of-assets): an asset bought on 31 March belongs to the FY
 * that ends that day; when that FY's books close, it gets that FY's full
 * depreciation rate if it was in use 180+ days that FY, or half the rate if it
 * was in use for fewer days (e.g. bought on the FY's last day = 1 day used).
 * A financial year in progress (asOfDate still inside it) contributes nothing
 * yet — that year's charge isn't "closed"/booked until the year itself ends,
 * which is why an asset bought 31 March shows its first (half-rate) charge the
 * moment the NEXT financial year begins (1 April), not the moment it was bought.
 */
function computeNetBookValue(asset, asOfDate = new Date()) {
  const cost = Number(asset.purchase_cost);
  const salvage = Number(asset.salvage_value);
  const lifeYears = Number(asset.useful_life_years);
  if (asset.status === 'disposed') return 0;
  if (!lifeYears) return cost;

  const purchaseDate = new Date(asset.purchase_date);
  const asOf = new Date(asOfDate);
  if (asOf <= purchaseDate) return cost;

  const isWdv = asset.depreciation_method === 'written_down_value';
  const wdvRate = salvage > 0 && cost > 0 ? 1 - (salvage / cost) ** (1 / lifeYears) : 1 / lifeYears;
  const slmAnnualAmount = Math.max(cost - salvage, 0) / lifeYears;

  let bookValue = cost;
  let fyStart = fyStartFor(purchaseDate);
  let yearIndex = 0;
  // Safety bound only — a fully-depreciated asset stops via bookValue <= salvage.
  const maxIterations = Math.ceil(lifeYears) + 2;

  while (yearIndex < maxIterations && bookValue > salvage) {
    const fyEnd = fyEndFor(fyStart);
    if (asOf < fyEnd) break; // this FY hasn't closed yet — nothing booked for it

    const isPurchaseYear = yearIndex === 0;
    const daysUsedThisFy = (fyEnd - (isPurchaseYear ? purchaseDate : fyStart)) / DAY_MS;
    const usageFraction = isPurchaseYear && daysUsedThisFy < HALF_YEAR_USE_THRESHOLD_DAYS ? 0.5 : 1;

    const annualAmount = isWdv ? bookValue * wdvRate : slmAnnualAmount;
    bookValue -= Math.min(annualAmount * usageFraction, bookValue - salvage);

    fyStart = fyEnd;
    yearIndex += 1;
  }

  return Math.max(bookValue, salvage);
}

function withComputedValue(asset) {
  if (!asset) return asset;
  const netBookValue = computeNetBookValue(asset);
  return { ...asset, accumulated_depreciation: Number(asset.purchase_cost) - netBookValue, net_book_value: netBookValue };
}

/**
 * Registers a purchased Fixed Asset (Chapter 13 §13.4-13.5). Posts purchaseCost as a
 * Finance expense via the existing recordExpense path (no GL logic duplicated here) —
 * consistent with how "Asset Purchase" rows are already categorized in this ledger.
 */
async function registerAsset(
  companyId,
  {
    itemId, vendorId, assetName, serialNumber, purchaseDate, purchaseCost, warrantyExpiry,
    branchId, warehouseId, custodianUserId, custodianName, locationNote,
    depreciationMethod, usefulLifeYears, salvageValue, remarks,
    transactionDate, gstApplicable, gstAmount, gstDetail, fundingSourceId, fundingType, utrReference, paymentMode, partyName,
    existingFinanceTransactionId,
  },
  actorId,
) {
  const item = await itemRepository.findById(companyId, itemId);
  if (!item) throw new AppError('COMMON_001');

  // existingFinanceTransactionId lets a Fixed Asset be registered against a purchase
  // already recorded in the ledger (e.g. via Quick Entry before this domain existed) —
  // posting a second expense here would double-count the same cash outflow in P&L.
  let expense = null;
  let financeTransactionId = existingFinanceTransactionId || null;
  if (!existingFinanceTransactionId) {
    expense = await financeService.recordExpense(
      companyId,
      {
        warehouseId,
        category: item.item_category_name || 'Fixed Asset Purchase',
        amount: purchaseCost,
        description: `Fixed asset purchase: ${assetName}`,
        transactionDate: transactionDate || purchaseDate,
        partyName,
        utrReference,
        paymentMode,
        fundingSourceId,
        fundingType,
        gstApplicable,
        gstAmount,
        gstDetail,
      },
      actorId,
    );
  }

  const asset = await withTransaction((client) =>
    fixedAssetRepository.create(
      client,
      companyId,
      {
        itemId,
        vendorId,
        assetName,
        serialNumber,
        purchaseDate,
        purchaseCost,
        warrantyExpiry,
        financeTransactionId,
        branchId,
        warehouseId,
        custodianUserId,
        custodianName,
        locationNote,
        depreciationMethod,
        usefulLifeYears,
        salvageValue,
        remarks,
      },
      actorId,
    ),
  );

  if (custodianUserId || custodianName || branchId || warehouseId) {
    await withTransaction((client) =>
      fixedAssetAssignmentRepository.create(
        client,
        { assetId: asset.id, branchId, warehouseId, custodianUserId, custodianName, locationNote, remarks: 'Initial assignment on registration' },
        actorId,
      ),
    );
  }

  return { asset: withComputedValue(asset), expense };
}

async function listAssets(companyId, pagination, filters) {
  const { rows, totalRecords } = await fixedAssetRepository.list(companyId, pagination, filters);
  return { rows: rows.map(withComputedValue), meta: buildPaginationMeta({ page: pagination.page, limit: pagination.limit, totalRecords }) };
}

async function getAsset(companyId, id) {
  const asset = await fixedAssetRepository.findById(companyId, id);
  if (!asset) throw new AppError('COMMON_001');
  const assignments = await fixedAssetAssignmentRepository.listByAsset(id);
  return { ...withComputedValue(asset), assignments };
}

/** Reassigning Location/Custodian is preserved as history (Chapter 13 §13.7), never overwritten in place. */
async function reassignAsset(companyId, id, { branchId, warehouseId, custodianUserId, custodianName, locationNote, remarks }, actorId) {
  return withTransaction(async (client) => {
    const asset = await fixedAssetRepository.findByIdForUpdate(client, companyId, id);
    if (!asset) throw new AppError('COMMON_001');

    const updated = await fixedAssetRepository.reassign(
      client,
      id,
      asset.version,
      { branchId, warehouseId, custodianUserId, custodianName, locationNote },
      actorId,
    );
    await fixedAssetAssignmentRepository.create(
      client,
      { assetId: id, branchId, warehouseId, custodianUserId, custodianName, locationNote, remarks },
      actorId,
    );
    return withComputedValue(updated);
  });
}

async function recordMaintenance(companyId, payload, actorId) {
  const asset = await fixedAssetRepository.findById(companyId, payload.assetId);
  if (!asset) throw new AppError('COMMON_001');

  let expense = null;
  if (payload.cost) {
    expense = await financeService.recordExpense(
      companyId,
      {
        category: 'Fixed Asset Maintenance',
        amount: payload.cost,
        description: `Maintenance: ${asset.asset_name}`,
        transactionDate: payload.maintenanceDate,
        partyName: payload.vendorName,
        paymentMode: payload.paymentMode,
      },
      actorId,
    );
  }

  const log = await fixedAssetMaintenanceRepository.create(companyId, payload, actorId);

  return withTransaction(async (client) => {
    const locked = await fixedAssetRepository.findByIdForUpdate(client, companyId, payload.assetId);
    if (payload.setUnderMaintenance) {
      await fixedAssetRepository.updateStatus(client, payload.assetId, locked.version, 'under_maintenance', actorId);
    }
    return { log, expense };
  });
}

async function listMaintenanceLogs(companyId, pagination, filters) {
  const { rows, totalRecords } = await fixedAssetMaintenanceRepository.list(companyId, pagination, filters);
  return { rows, meta: buildPaginationMeta({ page: pagination.page, limit: pagination.limit, totalRecords }) };
}

/** Disposal (Chapter 13 §13.9) permanently closes the asset lifecycle — never deleted. */
async function disposeAsset(companyId, id, { disposalType, disposalDate, disposalValue, remarks }, actorId) {
  const asset = await fixedAssetRepository.findById(companyId, id);
  if (!asset) throw new AppError('COMMON_001');
  if (asset.status === 'disposed') throw new AppError('COMMON_001', [], 'Asset is already disposed.');

  let disposalTx = null;
  if (disposalValue) {
    disposalTx = await financeService.recordTransaction(
      companyId,
      {
        transactionDate: disposalDate,
        referenceType: 'manual',
        direction: 'credit',
        amount: disposalValue,
        description: `Fixed asset disposal (${disposalType}): ${asset.asset_name}`,
      },
      actorId,
    );
  }

  return withTransaction(async (client) => {
    const locked = await fixedAssetRepository.findByIdForUpdate(client, companyId, id);
    const updated = await fixedAssetRepository.dispose(
      client,
      id,
      locked.version,
      { disposalType, disposalDate, disposalValue, disposalFinanceTransactionId: disposalTx?.id },
      actorId,
    );
    return withComputedValue(updated);
  });
}

module.exports = {
  registerAsset,
  listAssets,
  getAsset,
  reassignAsset,
  recordMaintenance,
  listMaintenanceLogs,
  disposeAsset,
  computeNetBookValue,
};
