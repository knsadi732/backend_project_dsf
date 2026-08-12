-- Raised the instant a work order is created (workOrder.service.js) — a
-- snapshot of what the product's BOM says is needed (raw_material_variant_id
-- + quantity_required per line), pending the Production Manager's approval
-- before warehouse/inventory ever sees it. Only once approved does the
-- system check actual stock, reserve what's available, and raise a
-- high-priority Purchase Request for any shortfall.
CREATE TABLE IF NOT EXISTS material_issue_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies (id),
  work_order_id UUID NOT NULL REFERENCES work_orders (id),
  warehouse_id UUID NOT NULL REFERENCES warehouses (id),

  mir_number VARCHAR(50) NOT NULL,
  status VARCHAR(30) NOT NULL DEFAULT 'pending_approval',
  version INTEGER NOT NULL DEFAULT 1,

  requested_by UUID NULL,
  approved_by UUID NULL,
  approved_at TIMESTAMP WITH TIME ZONE NULL,

  remarks TEXT NULL,
  created_by UUID NULL,
  updated_by UUID NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),

  is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
  deleted_at TIMESTAMP WITH TIME ZONE NULL,
  deleted_by UUID NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_mir_company_number ON material_issue_requests (company_id, mir_number) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_mir_company_id ON material_issue_requests (company_id) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_mir_work_order_id ON material_issue_requests (work_order_id) WHERE is_deleted = FALSE;

CREATE TABLE IF NOT EXISTS material_issue_request_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  material_issue_request_id UUID NOT NULL REFERENCES material_issue_requests (id),
  raw_material_variant_id UUID NOT NULL REFERENCES product_variants (id),
  quantity_required NUMERIC(14, 4) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_mir_items_mir_id ON material_issue_request_items (material_issue_request_id);
