-- GRN (Goods Receipt Note): auto-generated when a Purchase Order reaches 'completed'
-- (purchaseOrder.service.js), documenting what was actually received against the PO.
-- Stock itself is already added to Inventory earlier, at the 'partially_received' transition.
CREATE SEQUENCE IF NOT EXISTS grns_grn_seq START 1;

CREATE TABLE IF NOT EXISTS grns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies (id),
  branch_id UUID NULL REFERENCES branches (id),
  warehouse_id UUID NOT NULL REFERENCES warehouses (id),
  vendor_id UUID NOT NULL REFERENCES vendors (id),
  purchase_order_id UUID NOT NULL REFERENCES purchase_orders (id),

  grn_number VARCHAR(50) NOT NULL,
  status VARCHAR(30) NOT NULL DEFAULT 'completed',

  remarks TEXT NULL,
  created_by UUID NULL,
  updated_by UUID NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),

  is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
  deleted_at TIMESTAMP WITH TIME ZONE NULL,
  deleted_by UUID NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_grn_company_number ON grns (company_id, grn_number) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_grn_company_id ON grns (company_id) WHERE is_deleted = FALSE;
CREATE UNIQUE INDEX IF NOT EXISTS uq_grn_purchase_order_id ON grns (purchase_order_id) WHERE is_deleted = FALSE;
