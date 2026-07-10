-- Per-warehouse stock ledger. Quantity reads on the order/inventory path must
-- use SELECT ... FOR UPDATE (plan.md Chapter 4 — Anti-Overselling Policy).
CREATE TABLE IF NOT EXISTS warehouse_stock (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies (id),
  warehouse_id UUID NOT NULL REFERENCES warehouses (id),
  product_id UUID NOT NULL REFERENCES products (id),

  quantity_on_hand NUMERIC(14, 2) NOT NULL DEFAULT 0,
  quantity_reserved NUMERIC(14, 2) NOT NULL DEFAULT 0,
  version INTEGER NOT NULL DEFAULT 1,

  status VARCHAR(30) NOT NULL DEFAULT 'active',
  remarks TEXT NULL,

  created_by UUID NULL,
  updated_by UUID NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),

  is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
  deleted_at TIMESTAMP WITH TIME ZONE NULL,
  deleted_by UUID NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_warehouse_stock_wh_product ON warehouse_stock (warehouse_id, product_id) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_warehouse_stock_company_id ON warehouse_stock (company_id) WHERE is_deleted = FALSE;
