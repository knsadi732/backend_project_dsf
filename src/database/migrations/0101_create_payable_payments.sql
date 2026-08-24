-- Each payment posted against a payable's due balance (e.g. a month's rent
-- adjusted against a rent deposit due).
CREATE TABLE IF NOT EXISTS payable_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies (id),
  payable_id UUID NOT NULL REFERENCES payables (id),

  amount NUMERIC(14, 2) NOT NULL,
  paid_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),

  remarks TEXT NULL,
  created_by UUID NULL,
  updated_by UUID NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),

  is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
  deleted_at TIMESTAMP WITH TIME ZONE NULL,
  deleted_by UUID NULL
);

CREATE INDEX IF NOT EXISTS idx_payable_payments_payable_id ON payable_payments (payable_id) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_payable_payments_company_id ON payable_payments (company_id) WHERE is_deleted = FALSE;
