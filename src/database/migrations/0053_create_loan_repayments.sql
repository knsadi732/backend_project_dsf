-- Each repayment posted against a loan's principal + interest.
CREATE TABLE IF NOT EXISTS loan_repayments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies (id),
  loan_id UUID NOT NULL REFERENCES loans (id),

  amount NUMERIC(14, 2) NOT NULL,
  principal_component NUMERIC(14, 2) NOT NULL,
  interest_component NUMERIC(14, 2) NOT NULL DEFAULT 0,
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

CREATE INDEX IF NOT EXISTS idx_loan_repayments_loan_id ON loan_repayments (loan_id) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_loan_repayments_company_id ON loan_repayments (company_id) WHERE is_deleted = FALSE;
