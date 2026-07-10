-- Service-02: Company & Settings — one configurable settings row per company.
-- Base currency/locale/theme/gstin already live on companies; this holds the
-- remaining "Configurable Parameters Matrix" fields (plan.md Chapter 3).
CREATE TABLE IF NOT EXISTS company_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL UNIQUE REFERENCES companies (id),

  invoice_prefix VARCHAR(20) NOT NULL DEFAULT 'INV',
  invoice_sequence_next INTEGER NOT NULL DEFAULT 1,
  fiscal_year_start_month INTEGER NOT NULL DEFAULT 4, -- 1-12
  gst_settings JSONB NOT NULL DEFAULT '{}'::jsonb,
  notification_settings JSONB NOT NULL DEFAULT '{}'::jsonb,

  status VARCHAR(30) NOT NULL DEFAULT 'active',
  remarks TEXT NULL,

  created_by UUID NULL,
  updated_by UUID NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),

  is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
  deleted_at TIMESTAMP WITH TIME ZONE NULL,
  deleted_by UUID NULL
);
