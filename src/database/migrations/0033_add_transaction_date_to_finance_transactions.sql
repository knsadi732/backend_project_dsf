ALTER TABLE finance_transactions ADD COLUMN IF NOT EXISTS transaction_date DATE NOT NULL DEFAULT CURRENT_DATE;

-- Backfill existing rows so their ledger date matches when they were actually posted.
UPDATE finance_transactions SET transaction_date = created_at::date WHERE transaction_date = CURRENT_DATE;

CREATE INDEX IF NOT EXISTS idx_finance_tx_transaction_date ON finance_transactions (transaction_date) WHERE is_deleted = FALSE;
