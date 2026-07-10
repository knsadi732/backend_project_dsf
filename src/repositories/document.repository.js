const { query } = require('../config/db');
const { buildListQuery } = require('../utils/queryBuilder');

async function create(companyId, fields, createdBy) {
  const { rows } = await query(
    `INSERT INTO documents (company_id, branch_id, warehouse_id, entity_type, entity_id, file_key, file_name,
                             mime_type, size_bytes, is_public, uploaded_by, created_by, updated_by)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $11, $11)
     RETURNING *`,
    [
      companyId,
      fields.branchId || null,
      fields.warehouseId || null,
      fields.entityType,
      fields.entityId || null,
      fields.fileKey,
      fields.fileName,
      fields.mimeType,
      fields.sizeBytes,
      fields.isPublic || false,
      createdBy,
    ],
  );
  return rows[0];
}

async function findById(companyId, id) {
  const { rows } = await query(`SELECT * FROM documents WHERE id = $1 AND company_id = $2 AND is_deleted = FALSE`, [
    id,
    companyId,
  ]);
  return rows[0] || null;
}

/** Unscoped lookup for the pre-signed download path, where the token itself is the authorization proof. */
async function findByIdUnscoped(id) {
  const { rows } = await query(`SELECT * FROM documents WHERE id = $1 AND is_deleted = FALSE`, [id]);
  return rows[0] || null;
}

async function list(companyId, pagination, { entityType, entityId } = {}) {
  const extraConditions = [];
  const extraParams = [];
  if (entityType) {
    extraConditions.push(`entity_type = $${extraParams.length + 2}`);
    extraParams.push(entityType);
  }
  if (entityId) {
    extraConditions.push(`entity_id = $${extraParams.length + 2}`);
    extraParams.push(entityId);
  }

  const { dataSql, dataParams, countSql, countParams } = buildListQuery({
    table: 'documents',
    companyId,
    pagination,
    searchableColumns: ['file_name'],
    extraConditions,
    extraParams,
  });
  const [data, count] = await Promise.all([query(dataSql, dataParams), query(countSql, countParams)]);
  return { rows: data.rows, totalRecords: parseInt(count.rows[0].count, 10) };
}

async function softDelete(companyId, id, deletedBy) {
  const { rows } = await query(
    `UPDATE documents SET is_deleted = TRUE, deleted_at = now(), deleted_by = $3
     WHERE id = $1 AND company_id = $2 AND is_deleted = FALSE
     RETURNING file_key`,
    [id, companyId, deletedBy],
  );
  return rows[0] || null;
}

module.exports = { create, findById, findByIdUnscoped, list, softDelete };
