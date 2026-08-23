-- Stock movement audit trail (plan.md Ch10.8/Ch11 "Stock Ledger" — "every
-- inventory change creates an inventory movement record... fully
-- auditable"). Written inline by stock.service.js's existing mutators
-- (same transaction, never a separate write) — this table never drives
-- business logic itself, it's a read-only trace of what already happened
-- to `warehouse_stock`. `quantity_change` is signed: positive for
-- increases (purchase receipt, stock adjustment up), negative for
-- decreases (dispatch, stock adjustment down). `quantity_reserved_change`
-- is separate since a reservation event changes reserved, not on-hand.
CREATE TABLE IF NOT EXISTS inventory_movements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies (id),
  warehouse_id UUID NOT NULL REFERENCES warehouses (id),
  product_variant_id UUID NOT NULL REFERENCES product_variants (id),

  -- purchase_receipt | production_receipt | sales_reservation | dispatch |
  -- stock_transfer | return_receipt | damage_entry | stock_adjustment |
  -- physical_stock_count
  movement_type VARCHAR(30) NOT NULL,
  quantity_change NUMERIC(14, 3) NOT NULL DEFAULT 0,
  quantity_reserved_change NUMERIC(14, 3) NOT NULL DEFAULT 0,
  quantity_on_hand_after NUMERIC(14, 3) NULL,
  quantity_reserved_after NUMERIC(14, 3) NULL,

  reference_type VARCHAR(30) NULL, -- order | purchase_order | material_issue_request | manual
  reference_id UUID NULL,
  remarks TEXT NULL,

  created_by UUID NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_inventory_movements_company_id ON inventory_movements (company_id);
CREATE INDEX IF NOT EXISTS idx_inventory_movements_warehouse_id ON inventory_movements (warehouse_id);
CREATE INDEX IF NOT EXISTS idx_inventory_movements_variant_id ON inventory_movements (product_variant_id);
CREATE INDEX IF NOT EXISTS idx_inventory_movements_created_at ON inventory_movements (created_at);
