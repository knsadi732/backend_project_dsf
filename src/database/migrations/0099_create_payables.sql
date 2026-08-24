-- General payable/due tracking for money owed to any party outside the
-- Purchase-Order flow (vendor_bills is GRN/PO-bound — see 0063). Covers cases
-- like a rent deposit owed to a landlord that isn't paid up front but is
-- instead settled down over time (e.g. adjusted against monthly rent).
-- amount_due is never stored directly — it's total_amount - amount_paid,
-- recomputed on every payment (see payable.service.js), mirroring vendor_bills.
CREATE TABLE IF NOT EXISTS payables (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies (id),
  branch_id UUID NULL REFERENCES branches (id),

  payable_number VARCHAR(50) NOT NULL,
  party_name VARCHAR(255) NOT NULL,
  purpose VARCHAR(255) NOT NULL,
  total_amount NUMERIC(14, 2) NOT NULL,
  amount_paid NUMERIC(14, 2) NOT NULL DEFAULT 0,
  amount_due NUMERIC(14, 2) GENERATED ALWAYS AS (total_amount - amount_paid) STORED,
  due_date DATE NULL,

  status VARCHAR(20) NOT NULL DEFAULT 'pending', -- pending | partial | paid | written_off
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

CREATE UNIQUE INDEX IF NOT EXISTS uq_payables_company_number ON payables (company_id, payable_number) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_payables_company_id ON payables (company_id) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_payables_status ON payables (status) WHERE is_deleted = FALSE;
