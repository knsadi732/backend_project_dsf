-- Quantity-tracked stock for stock_kind items (raw_material | packaging_material |
-- consumable | spare_part) — mirrors warehouse_stock (0016) but keyed to items, since
-- Product and Item/Material are separate masters and must never share a stock table.
CREATE TABLE IF NOT EXISTS item_stock (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies (id),
  warehouse_id UUID NOT NULL REFERENCES warehouses (id),
  item_id UUID NOT NULL REFERENCES items (id),

  quantity_on_hand NUMERIC(14, 3) NOT NULL DEFAULT 0,
  quantity_reserved NUMERIC(14, 3) NOT NULL DEFAULT 0,
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

CREATE UNIQUE INDEX IF NOT EXISTS uq_item_stock_warehouse_item ON item_stock (warehouse_id, item_id) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_item_stock_company_id ON item_stock (company_id) WHERE is_deleted = FALSE;

-- One row per item movement (receipt/consumption), the item-domain equivalent of a
-- stock ledger — lets stock changes stay auditable the same way finance_transactions
-- audits money movement.
CREATE TABLE IF NOT EXISTS item_stock_movements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies (id),
  warehouse_id UUID NOT NULL REFERENCES warehouses (id),
  item_id UUID NOT NULL REFERENCES items (id),

  movement_type VARCHAR(20) NOT NULL, -- 'receipt' | 'consumption' | 'adjustment'
  quantity_change NUMERIC(14, 3) NOT NULL, -- signed: positive for receipt, negative for consumption
  quantity_on_hand_after NUMERIC(14, 3) NOT NULL,
  reference_type VARCHAR(50) NULL, -- 'manual_receipt' | 'production_consumption' | 'adjustment'
  reference_id UUID NULL,
  finance_transaction_id UUID NULL REFERENCES finance_transactions (id),
  remarks TEXT NULL,

  created_by UUID NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),

  is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
  deleted_at TIMESTAMP WITH TIME ZONE NULL,
  deleted_by UUID NULL
);

CREATE INDEX IF NOT EXISTS idx_item_stock_movements_item ON item_stock_movements (item_id) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_item_stock_movements_company_id ON item_stock_movements (company_id) WHERE is_deleted = FALSE;
