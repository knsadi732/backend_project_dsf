-- Order Lifecycle Pipeline State Machine (plan.md Chapter 4):
-- Pending -> Confirmed (stock reserved) -> Packed -> Dispatched -> Delivered -> Completed.
-- Payment Status Pipeline: Pending -> Partial -> Paid -> Refunded.
CREATE TABLE IF NOT EXISTS orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies (id),
  branch_id UUID NULL REFERENCES branches (id),
  warehouse_id UUID NOT NULL REFERENCES warehouses (id),
  customer_id UUID NOT NULL REFERENCES customers (id),

  order_number VARCHAR(50) NOT NULL,
  status VARCHAR(30) NOT NULL DEFAULT 'pending',
  payment_status VARCHAR(30) NOT NULL DEFAULT 'pending',

  subtotal NUMERIC(14, 2) NOT NULL DEFAULT 0,
  tax_amount NUMERIC(14, 2) NOT NULL DEFAULT 0,
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

CREATE UNIQUE INDEX IF NOT EXISTS uq_orders_company_number ON orders (company_id, order_number) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_orders_company_id ON orders (company_id) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders (status) WHERE is_deleted = FALSE;
