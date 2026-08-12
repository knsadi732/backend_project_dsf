-- Manufacturing work order: raised (manually or auto, off a stock shortfall
-- at sales-order creation — order.service.js) to produce `quantity` units of
-- a finished product. Stage pipeline: pending -> in_progress -> completed,
-- can be cancelled from pending/in_progress.
CREATE TABLE IF NOT EXISTS work_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies (id),
  product_id UUID NOT NULL REFERENCES products (id),
  sales_order_id UUID NULL REFERENCES orders (id),

  work_order_number VARCHAR(50) NOT NULL,
  quantity NUMERIC(14, 3) NOT NULL,
  stage VARCHAR(30) NOT NULL DEFAULT 'pending',
  due_date DATE NULL,

  raw_material_cost NUMERIC(14, 2) NOT NULL DEFAULT 0,
  labour_cost NUMERIC(14, 2) NOT NULL DEFAULT 0,
  machine_cost NUMERIC(14, 2) NOT NULL DEFAULT 0,
  electricity_cost NUMERIC(14, 2) NOT NULL DEFAULT 0,
  packaging_cost NUMERIC(14, 2) NOT NULL DEFAULT 0,
  overhead_cost NUMERIC(14, 2) NOT NULL DEFAULT 0,

  remarks TEXT NULL,
  created_by UUID NULL,
  updated_by UUID NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),

  is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
  deleted_at TIMESTAMP WITH TIME ZONE NULL,
  deleted_by UUID NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_work_orders_company_number ON work_orders (company_id, work_order_number) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_work_orders_company_id ON work_orders (company_id) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_work_orders_sales_order_id ON work_orders (sales_order_id) WHERE is_deleted = FALSE;
