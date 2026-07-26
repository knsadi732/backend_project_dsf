-- Vendor Bill (Payable): auto-generated alongside the GRN (grn.service.js#createFromGrn),
-- giving Finance a single view of what's owed to a vendor for a completed PO/GRN
-- (plan.md Chapter 15: Invoice -> Payment -> Ledger -> Outstanding).
CREATE SEQUENCE IF NOT EXISTS vendor_bills_seq START 1;

CREATE TABLE IF NOT EXISTS vendor_bills (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies (id),
  branch_id UUID NULL REFERENCES branches (id),
  warehouse_id UUID NOT NULL REFERENCES warehouses (id),
  vendor_id UUID NOT NULL REFERENCES vendors (id),
  grn_id UUID NOT NULL REFERENCES grns (id),
  purchase_order_id UUID NOT NULL REFERENCES purchase_orders (id),

  invoice_number VARCHAR(50) NOT NULL,
  total_amount NUMERIC(14, 2) NOT NULL,
  amount_paid NUMERIC(14, 2) NOT NULL DEFAULT 0,
  amount_due NUMERIC(14, 2) GENERATED ALWAYS AS (total_amount - amount_paid) STORED,
  payment_due_date DATE NULL,
  status VARCHAR(30) NOT NULL DEFAULT 'pending', -- 'pending' | 'partial' | 'paid'
  utr_number VARCHAR(100) NULL,
  paid_at TIMESTAMP WITH TIME ZONE NULL,
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

CREATE UNIQUE INDEX IF NOT EXISTS uq_vendor_bill_company_number ON vendor_bills (company_id, invoice_number) WHERE is_deleted = FALSE;
CREATE UNIQUE INDEX IF NOT EXISTS uq_vendor_bill_grn_id ON vendor_bills (grn_id) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_vendor_bill_company_id ON vendor_bills (company_id) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_vendor_bill_vendor_id ON vendor_bills (vendor_id) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_vendor_bill_status ON vendor_bills (status) WHERE is_deleted = FALSE;
