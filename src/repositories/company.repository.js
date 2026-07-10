const { query } = require('../config/db');

async function findById(companyId) {
  const { rows } = await query(`SELECT * FROM companies WHERE id = $1 AND is_deleted = FALSE`, [companyId]);
  return rows[0] || null;
}

async function update(companyId, fields, updatedBy) {
  const { rows } = await query(
    `UPDATE companies
     SET name = COALESCE($2, name),
         legal_name = COALESCE($3, legal_name),
         gstin = COALESCE($4, gstin),
         base_currency = COALESCE($5, base_currency),
         locale = COALESCE($6, locale),
         theme = COALESCE($7, theme),
         updated_by = $8,
         updated_at = now()
     WHERE id = $1 AND is_deleted = FALSE
     RETURNING *`,
    [
      companyId,
      fields.name,
      fields.legalName,
      fields.gstin,
      fields.baseCurrency,
      fields.locale,
      fields.theme,
      updatedBy,
    ],
  );
  return rows[0] || null;
}

module.exports = { findById, update };
