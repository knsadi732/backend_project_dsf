-- Accountant scope: daily transaction entries (general ledger). Every write
-- here runs inside a Postgres transaction at the repository layer (plan.md
-- Chapter 4 — Transaction Management) with REPEATABLE READ/SERIALIZABLE isolation.
CREATE TABLE IF NOT EXISTS finance_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies (id),
  branch_id UUID NULL REFERENCES branches (id),
  fiscal_period_id UUID NULL REFERENCES fiscal_periods (id),

  reference_type VARCHAR(50) NOT NULL, -- 'order' | 'purchase_order' | 'expense' | 'manual'
  reference_id UUID NULL,
  direction VARCHAR(10) NOT NULL, -- 'debit' | 'credit'
  amount NUMERIC(14, 2) NOT NULL,
  description TEXT,

  status VARCHAR(30) NOT NULL DEFAULT 'posted',
  remarks TEXT NULL,
  created_by UUID NULL,
  updated_by UUID NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),

  is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
  deleted_at TIMESTAMP WITH TIME ZONE NULL,
  deleted_by UUID NULL
);

CREATE INDEX IF NOT EXISTS idx_finance_tx_company_id ON finance_transactions (company_id) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_finance_tx_fiscal_period ON finance_transactions (fiscal_period_id);
