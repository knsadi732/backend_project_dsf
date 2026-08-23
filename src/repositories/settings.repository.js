const { query } = require('../config/db');

async function findByCompanyId(companyId) {
  const { rows } = await query(`SELECT * FROM company_settings WHERE company_id = $1 AND is_deleted = FALSE`, [
    companyId,
  ]);
  return rows[0] || null;
}

/** Upserts the single settings row for a tenant. */
async function upsert(companyId, fields, actorId) {
  const { rows } = await query(
    `INSERT INTO company_settings (company_id, invoice_prefix, invoice_sequence_next, fiscal_year_start_month,
                                    gst_settings, notification_settings, daily_production_target, created_by, updated_by)
     VALUES ($1, COALESCE($2, 'INV'), COALESCE($3, 1), COALESCE($4, 4), COALESCE($5, '{}'::jsonb), COALESCE($6, '{}'::jsonb), $7, $8, $8)
     ON CONFLICT (company_id) DO UPDATE
     SET invoice_prefix = COALESCE($2, company_settings.invoice_prefix),
         invoice_sequence_next = COALESCE($3, company_settings.invoice_sequence_next),
         fiscal_year_start_month = COALESCE($4, company_settings.fiscal_year_start_month),
         gst_settings = COALESCE($5, company_settings.gst_settings),
         notification_settings = COALESCE($6, company_settings.notification_settings),
         daily_production_target = COALESCE($7, company_settings.daily_production_target),
         updated_by = $8,
         updated_at = now()
     RETURNING *`,
    [
      companyId,
      fields.invoicePrefix,
      fields.invoiceSequenceNext,
      fields.fiscalYearStartMonth,
      fields.gstSettings ? JSON.stringify(fields.gstSettings) : null,
      fields.notificationSettings ? JSON.stringify(fields.notificationSettings) : null,
      fields.dailyProductionTarget,
      actorId,
    ],
  );
  return rows[0];
}

/** Atomically claims the next invoice number for a tenant (used by bills/invoices). */
async function claimNextInvoiceNumber(client, companyId) {
  const { rows } = await client.query(
    `UPDATE company_settings
     SET invoice_sequence_next = invoice_sequence_next + 1, updated_at = now()
     WHERE company_id = $1
     RETURNING invoice_prefix, invoice_sequence_next - 1 AS claimed_sequence`,
    [companyId],
  );
  if (!rows[0]) return null;
  return `${rows[0].invoice_prefix}-${String(rows[0].claimed_sequence).padStart(6, '0')}`;
}

module.exports = { findByCompanyId, upsert, claimNextInvoiceNumber };
