-- Purchase Request: an internal ask for goods, raised before any vendor/PO exists.
-- Approval Workflow (plan.md-style): Pending -> Approved | Rejected (terminal either way).
-- Once approved, procurement raises a separate Purchase Order against a vendor.
CREATE TABLE IF NOT EXISTS purchase_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies (id),
  branch_id UUID NULL REFERENCES branches (id),
  warehouse_id UUID NOT NULL REFERENCES warehouses (id),
  department_id UUID NULL REFERENCES departments (id),
  requested_by UUID NOT NULL REFERENCES users (id),

  pr_number VARCHAR(50) NOT NULL,
  status VARCHAR(30) NOT NULL DEFAULT 'pending',
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

CREATE UNIQUE INDEX IF NOT EXISTS uq_pr_company_number ON purchase_requests (company_id, pr_number) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_pr_company_id ON purchase_requests (company_id) WHERE is_deleted = FALSE;
