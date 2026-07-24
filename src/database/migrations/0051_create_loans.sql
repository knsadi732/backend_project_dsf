-- Loan/debt tracking: money borrowed by the company from a bank/vendor/other lender.
-- Outstanding balance is never stored here — it's always derived as
-- principal_amount - SUM(loan_repayments.principal_component), see loan.service.js.
CREATE TABLE IF NOT EXISTS loans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies (id),
  branch_id UUID NULL REFERENCES branches (id),

  loan_number VARCHAR(50) NOT NULL,
  lender_name VARCHAR(255) NOT NULL,
  lender_type VARCHAR(30) NOT NULL DEFAULT 'bank', -- bank | vendor | other
  principal_amount NUMERIC(14, 2) NOT NULL,
  interest_rate NUMERIC(5, 2) NOT NULL DEFAULT 0, -- annual percentage
  interest_type VARCHAR(20) NOT NULL DEFAULT 'flat', -- flat | reducing
  start_date DATE NOT NULL,
  tenure_months INTEGER NULL,

  status VARCHAR(30) NOT NULL DEFAULT 'active', -- active | closed | written_off
  version INTEGER NOT NULL DEFAULT 1,
  remarks TEXT NULL,
  created_by UUID NULL,
  updated_by UUID NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),

  is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
  deleted_at TIMESTAMP WITH TIME ZONE NULL,
  deleted_by UUID NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_loans_company_number ON loans (company_id, loan_number) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_loans_company_id ON loans (company_id) WHERE is_deleted = FALSE;
