const { query } = require('../config/db');
const { buildListQuery } = require('../utils/queryBuilder');

const SELECT_WITH_JOINS = `
  SELECT i.*, ic.category_name AS item_category_name, ic.stock_kind, v.name AS preferred_vendor_name
  FROM items i
  LEFT JOIN item_categories ic ON ic.id = i.item_category_id
  LEFT JOIN vendors v ON v.id = i.preferred_vendor_id
`;

async function list(companyId, pagination, { itemCategoryId } = {}) {
  const extraConditions = [];
  const extraParams = [];
  if (itemCategoryId) {
    extraConditions.push(`item_category_id = $${extraParams.length + 2}`);
    extraParams.push(itemCategoryId);
  }

  const { dataSql, dataParams, countSql, countParams } = buildListQuery({
    table: 'items',
    companyId,
    pagination,
    searchableColumns: ['item_name', 'item_code'],
    extraConditions,
    extraParams,
  });
  const [data, count] = await Promise.all([query(dataSql, dataParams), query(countSql, countParams)]);
  return { rows: data.rows, totalRecords: parseInt(count.rows[0].count, 10) };
}

async function findById(companyId, id) {
  const { rows } = await query(`${SELECT_WITH_JOINS} WHERE i.id = $1 AND i.company_id = $2 AND i.is_deleted = FALSE`, [
    id,
    companyId,
  ]);
  return rows[0] || null;
}

async function generateItemCode(runner = query) {
  const { rows } = await runner(`SELECT 'ITM-' || LPAD(nextval('items_item_seq')::text, 5, '0') AS item_code`);
  return rows[0].item_code;
}

async function create(
  companyId,
  { itemCategoryId, preferredVendorId, itemCode, itemName, description, uom, hsnCode, gstPercentage, standardCost, reorderLevel, specification },
  createdBy,
) {
  const code = itemCode || (await generateItemCode());
  const { rows } = await query(
    `INSERT INTO items (company_id, item_category_id, preferred_vendor_id, item_code, item_name, description, uom,
                         hsn_code, gst_percentage, standard_cost, reorder_level, specification, created_by, updated_by)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $13)
     RETURNING *`,
    [
      companyId,
      itemCategoryId,
      preferredVendorId || null,
      code,
      itemName,
      description || null,
      uom || 'unit',
      hsnCode || null,
      gstPercentage || 0,
      standardCost || 0,
      reorderLevel || 0,
      JSON.stringify(specification || {}),
      createdBy,
    ],
  );
  return rows[0];
}

async function update(
  companyId,
  id,
  { itemCategoryId, preferredVendorId, itemName, description, uom, hsnCode, gstPercentage, standardCost, reorderLevel, specification, status },
  updatedBy,
) {
  const { rows } = await query(
    `UPDATE items
     SET item_category_id = COALESCE($3, item_category_id),
         preferred_vendor_id = COALESCE($4, preferred_vendor_id),
         item_name = COALESCE($5, item_name),
         description = COALESCE($6, description),
         uom = COALESCE($7, uom),
         hsn_code = COALESCE($8, hsn_code),
         gst_percentage = COALESCE($9, gst_percentage),
         standard_cost = COALESCE($10, standard_cost),
         reorder_level = COALESCE($11, reorder_level),
         specification = COALESCE($12, specification),
         status = COALESCE($13, status),
         updated_by = $14, updated_at = now()
     WHERE id = $1 AND company_id = $2 AND is_deleted = FALSE
     RETURNING *`,
    [
      id,
      companyId,
      itemCategoryId || null,
      preferredVendorId || null,
      itemName || null,
      description,
      uom || null,
      hsnCode,
      gstPercentage,
      standardCost,
      reorderLevel,
      specification ? JSON.stringify(specification) : null,
      status || null,
      updatedBy,
    ],
  );
  return rows[0] || null;
}

async function softDelete(companyId, id, deletedBy) {
  const { rows } = await query(
    `UPDATE items SET is_deleted = TRUE, deleted_at = now(), deleted_by = $3
     WHERE id = $1 AND company_id = $2 AND is_deleted = FALSE
     RETURNING id`,
    [id, companyId, deletedBy],
  );
  return rows[0] || null;
}

module.exports = { list, findById, create, update, softDelete, generateItemCode };
