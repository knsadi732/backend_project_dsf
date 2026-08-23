const asyncHandler = require('../utils/asyncHandler');
const { sendSuccess } = require('../utils/response');
const service = require('../services/inventoryMovement.service');

const list = asyncHandler(async (req, res) => {
  const { rows, meta } = await service.listMovements(req.tenant.companyId, req.pagination, {
    warehouseId: req.query.warehouse_id,
    productVariantId: req.query.product_variant_id,
    movementType: req.query.movement_type,
  });
  return sendSuccess(res, { message: 'Inventory movements list.', data: rows, meta });
});

module.exports = { list };
