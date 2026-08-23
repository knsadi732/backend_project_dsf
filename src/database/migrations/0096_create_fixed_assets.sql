-- Fixed Asset Domain (Business_Data_Model.md Chapter 13): one row per individually-
-- identified asset (machinery, computers, furniture, vehicles, equipment, and Tools —
-- Tools are treated as company-owned assets, not quantity-tracked item_stock). Never
-- aggregated into a quantity the way item_stock is — 5 identical laptops = 5 rows here.
CREATE SEQUENCE IF NOT EXISTS fixed_assets_asset_seq START 1;

CREATE TABLE IF NOT EXISTS fixed_assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies (id),
  item_id UUID NOT NULL REFERENCES items (id),
  vendor_id UUID NULL REFERENCES vendors (id),

  asset_tag VARCHAR(50) NOT NULL,
  asset_name VARCHAR(255) NOT NULL,
  serial_number VARCHAR(100) NULL,

  -- Acquisition
  purchase_date DATE NOT NULL,
  purchase_cost NUMERIC(14, 2) NOT NULL,
  warranty_expiry DATE NULL,
  finance_transaction_id UUID NULL REFERENCES finance_transactions (id),

  -- Assignment
  branch_id UUID NULL REFERENCES branches (id),
  warehouse_id UUID NULL REFERENCES warehouses (id),
  custodian_user_id UUID NULL REFERENCES users (id),
  location_note VARCHAR(255) NULL,

  -- Depreciation
  depreciation_method VARCHAR(20) NOT NULL DEFAULT 'straight_line', -- straight_line | written_down_value
  useful_life_years NUMERIC(5, 2) NOT NULL DEFAULT 0,
  salvage_value NUMERIC(14, 2) NOT NULL DEFAULT 0,

  -- Disposal
  disposal_type VARCHAR(20) NULL, -- sale | write_off | scrap
  disposal_date DATE NULL,
  disposal_value NUMERIC(14, 2) NULL,
  disposal_finance_transaction_id UUID NULL REFERENCES finance_transactions (id),

  status VARCHAR(30) NOT NULL DEFAULT 'in_use', -- in_use | under_maintenance | idle | disposed
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

CREATE UNIQUE INDEX IF NOT EXISTS uq_fixed_assets_company_tag ON fixed_assets (company_id, asset_tag) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_fixed_assets_company_id ON fixed_assets (company_id) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_fixed_assets_custodian ON fixed_assets (custodian_user_id) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_fixed_assets_status ON fixed_assets (status) WHERE is_deleted = FALSE;

-- Asset Assignment history (Chapter 13 §13.7) — reassigning location/custodian is
-- preserved as history, not overwritten in place.
CREATE TABLE IF NOT EXISTS fixed_asset_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_id UUID NOT NULL REFERENCES fixed_assets (id),
  branch_id UUID NULL REFERENCES branches (id),
  warehouse_id UUID NULL REFERENCES warehouses (id),
  custodian_user_id UUID NULL REFERENCES users (id),
  location_note VARCHAR(255) NULL,
  assigned_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  assigned_by UUID NULL,
  remarks TEXT NULL,

  is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
  deleted_at TIMESTAMP WITH TIME ZONE NULL,
  deleted_by UUID NULL
);

CREATE INDEX IF NOT EXISTS idx_fixed_asset_assignments_asset ON fixed_asset_assignments (asset_id) WHERE is_deleted = FALSE;

-- Maintenance Log (Chapter 13 §13.8).
CREATE TABLE IF NOT EXISTS fixed_asset_maintenance_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_id UUID NOT NULL REFERENCES fixed_assets (id),
  company_id UUID NOT NULL REFERENCES companies (id),

  maintenance_type VARCHAR(20) NOT NULL DEFAULT 'scheduled', -- scheduled | breakdown
  maintenance_date DATE NOT NULL,
  vendor_name VARCHAR(255) NULL,
  cost NUMERIC(14, 2) NOT NULL DEFAULT 0,
  downtime_hours NUMERIC(6, 2) NULL,
  next_scheduled_date DATE NULL,
  finance_transaction_id UUID NULL REFERENCES finance_transactions (id),
  remarks TEXT NULL,

  created_by UUID NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),

  is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
  deleted_at TIMESTAMP WITH TIME ZONE NULL,
  deleted_by UUID NULL
);

CREATE INDEX IF NOT EXISTS idx_fixed_asset_maintenance_asset ON fixed_asset_maintenance_logs (asset_id) WHERE is_deleted = FALSE;
