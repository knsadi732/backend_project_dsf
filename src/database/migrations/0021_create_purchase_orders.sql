-- Purchase Order Progression States (plan.md Chapter 4): Draft -> Approved -> Ordered -> Received -> Completed.
CREATE TABLE IF NOT EXISTS purchase_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies (id),
  branch_id UUID NULL REFERENCES branches (id),
  warehouse_id UUID NOT NULL REFERENCES warehouses (id),
  vendor_id UUID NOT NULL REFERENCES vendors (id),

  po_number VARCHAR(50) NOT NULL,
  status VARCHAR(30) NOT NULL DEFAULT 'draft',
  total_amount NUMERIC(14, 2) NOT NULL DEFAULT 0,
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

CREATE UNIQUE INDEX IF NOT EXISTS uq_po_company_number ON purchase_orders (company_id, po_number) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_po_company_id ON purchase_orders (company_id) WHERE is_deleted = FALSE;
