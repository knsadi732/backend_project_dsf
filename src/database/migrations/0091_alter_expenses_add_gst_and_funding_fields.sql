ALTER TABLE expenses
  ADD COLUMN IF NOT EXISTS gst_applicable BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS gst_amount NUMERIC(14, 2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS funding_source_id UUID NULL REFERENCES funding_sources (id),
  ADD COLUMN IF NOT EXISTS funding_type VARCHAR(30) NULL,
  ADD COLUMN IF NOT EXISTS utr_reference VARCHAR(100) NULL,
  ADD COLUMN IF NOT EXISTS payment_mode VARCHAR(30) NULL;

CREATE INDEX IF NOT EXISTS idx_expenses_funding_source ON expenses (funding_source_id) WHERE is_deleted = FALSE;
