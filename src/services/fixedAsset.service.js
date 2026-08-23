const AppError = require('../utils/AppError');
const { withTransaction } = require('../config/db');
const { buildPaginationMeta } = require('../utils/pagination');
const fixedAssetRepository = require('../repositories/fixedAsset.repository');
const fixedAssetAssignmentRepository = require('../repositories/fixedAssetAssignment.repository');
const fixedAssetMaintenanceRepository = require('../repositories/fixedAssetMaintenance.repository');
const itemRepository = require('../repositories/item.repository');
const financeService = require('./finance.service');

const MS_PER_YEAR = 365.25 * 24 * 60 * 60 * 1000;

/**
 * Net Book Value is always derived, never stored (same pattern as loans.repository.js's
 * outstanding-balance-from-repayments — see loan.service.js).
 */
function computeNetBookValue(asset, asOfDate = new Date()) {
  const cost = Number(asset.purchase_cost);
  const salvage = Number(asset.salvage_value);
  const lifeYears = Number(asset.useful_life_years);
  if (asset.status === 'disposed') return 0;
  if (!lifeYears) return cost;

  const yearsElapsed = Math.max((new Date(asOfDate) - new Date(asset.purchase_date)) / MS_PER_YEAR, 0);
  const depreciableBase = Math.max(cost - salvage, 0);

  if (asset.depreciation_method === 'written_down_value') {
    const rate = salvage > 0 && cost > 0 ? 1 - (salvage / cost) ** (1 / lifeYears) : 1 / lifeYears;
    const nbv = cost * (1 - rate) ** Math.min(yearsElapsed, lifeYears);
    return Math.max(nbv, salvage);
  }

  const accumulated = Math.min((depreciableBase / lifeYears) * yearsElapsed, depreciableBase);
  return Math.max(cost - accumulated, salvage);
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
    branchId, warehouseId, custodianUserId, locationNote,
    depreciationMethod, usefulLifeYears, salvageValue, remarks,
    transactionDate, gstApplicable, gstAmount, gstDetail, fundingSourceId, fundingType, utrReference, paymentMode, partyName,
  },
  actorId,
) {
  const item = await itemRepository.findById(companyId, itemId);
  if (!item) throw new AppError('COMMON_001');

  const expense = await financeService.recordExpense(
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
        branchId,
        warehouseId,
        custodianUserId,
        locationNote,
        depreciationMethod,
        usefulLifeYears,
        salvageValue,
        remarks,
      },
      actorId,
    ),
  );

  if (custodianUserId || branchId || warehouseId) {
    await withTransaction((client) =>
      fixedAssetAssignmentRepository.create(
        client,
        { assetId: asset.id, branchId, warehouseId, custodianUserId, locationNote, remarks: 'Initial assignment on registration' },
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
async function reassignAsset(companyId, id, { branchId, warehouseId, custodianUserId, locationNote, remarks }, actorId) {
  return withTransaction(async (client) => {
    const asset = await fixedAssetRepository.findByIdForUpdate(client, companyId, id);
    if (!asset) throw new AppError('COMMON_001');

    const updated = await fixedAssetRepository.reassign(
      client,
      id,
      asset.version,
      { branchId, warehouseId, custodianUserId, locationNote },
      actorId,
    );
    await fixedAssetAssignmentRepository.create(
      client,
      { assetId: id, branchId, warehouseId, custodianUserId, locationNote, remarks },
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
