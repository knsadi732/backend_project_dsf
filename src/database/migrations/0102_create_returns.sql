-- Customer/courier returns against a Sales Order — replaces the frontend's
-- former mock simulation (services/api/mockDb.js + businessRules.js) with a
-- real, persisted pipeline: requested -> approved/rejected -> pickup_scheduled
-- -> warehouse_received -> inspection_completed -> resolved. See
-- return.service.js for the side effects fired on each status transition
-- (restock/repair/scrap on inspection, credit note on refund resolution).
CREATE SEQUENCE IF NOT EXISTS returns_seq START 1;

CREATE TABLE IF NOT EXISTS returns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies (id),
  branch_id UUID NULL REFERENCES branches (id),
  order_id UUID NOT NULL REFERENCES orders (id),
  product_variant_id UUID NOT NULL REFERENCES product_variants (id),
  warehouse_id UUID NULL REFERENCES warehouses (id),

  return_number VARCHAR(50) NOT NULL,
  quantity NUMERIC(14, 3) NOT NULL,
  type VARCHAR(20) NOT NULL DEFAULT 'customer', -- 'customer' (CR) | 'courier' (RTO)
  reason VARCHAR(50) NOT NULL,
  amount NUMERIC(14, 2) NOT NULL DEFAULT 0,

  status VARCHAR(30) NOT NULL DEFAULT 'requested',
  courier_partner VARCHAR(100) NULL,
  pickup_date DATE NULL,
  tracking_number VARCHAR(100) NULL,
  inspection_result VARCHAR(20) NULL, -- passed | failed | repairable | scrap
  inspection_notes TEXT NULL,
  decision VARCHAR(20) NULL, -- restock | repair | scrap | reject

  resolution_type VARCHAR(20) NOT NULL DEFAULT 'none', -- none | refund | replacement
  refund_amount NUMERIC(14, 2) NOT NULL DEFAULT 0,
  refund_method VARCHAR(30) NULL,
  refund_reference VARCHAR(100) NULL,
  refund_date DATE NULL,
  refund_status VARCHAR(20) NOT NULL DEFAULT 'pending',
  replacement_order_id UUID NULL REFERENCES orders (id),

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

CREATE UNIQUE INDEX IF NOT EXISTS uq_returns_company_number ON returns (company_id, return_number) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_returns_company_id ON returns (company_id) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_returns_status ON returns (status) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_returns_order_id ON returns (order_id) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_returns_type ON returns (type) WHERE is_deleted = FALSE;
