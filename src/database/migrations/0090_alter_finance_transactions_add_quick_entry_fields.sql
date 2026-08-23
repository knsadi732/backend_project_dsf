-- Columns needed for the spreadsheet-shaped quick-entry ledger row (finance.service.js#quickEntry):
-- UTR/reference, nature, payment mode, counterparty, funding source, who paid/received, category.
ALTER TABLE finance_transactions
  ADD COLUMN IF NOT EXISTS utr_reference VARCHAR(100) NULL,
  ADD COLUMN IF NOT EXISTS transaction_nature VARCHAR(50) NULL,
  ADD COLUMN IF NOT EXISTS payment_mode VARCHAR(30) NULL,
  ADD COLUMN IF NOT EXISTS party_name VARCHAR(255) NULL,
  ADD COLUMN IF NOT EXISTS funding_source_id UUID NULL REFERENCES funding_sources (id),
  ADD COLUMN IF NOT EXISTS funding_type VARCHAR(30) NULL,
  ADD COLUMN IF NOT EXISTS paid_received_by UUID NULL,
  ADD COLUMN IF NOT EXISTS category VARCHAR(100) NULL;

CREATE INDEX IF NOT EXISTS idx_finance_tx_funding_source ON finance_transactions (funding_source_id) WHERE is_deleted = FALSE;
