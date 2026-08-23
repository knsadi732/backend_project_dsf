-- Physical warehouse storage hierarchy (plan.md Ch10/14): a Warehouse
-- contains Zones (receiving/storage/production/packing/dispatch/return/
-- damage), a Zone contains Racks, a Rack contains Shelves, a Shelf contains
-- Bins. Purely spatial master data for locating stock physically within a
-- warehouse — it does not replace `warehouse_stock` (which still tracks
-- actual on-hand/reserved quantity per product variant); `bins.current_quantity`
-- here is a manually-tracked "what's physically in this bin right now" count,
-- independent of the variant-level stock ledger.
CREATE TABLE IF NOT EXISTS warehouse_zones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies (id),
  warehouse_id UUID NOT NULL REFERENCES warehouses (id),

  name VARCHAR(255) NOT NULL,
  zone_type VARCHAR(20) NOT NULL DEFAULT 'storage', -- receiving | storage | production | packing | dispatch | return | damage
  status VARCHAR(20) NOT NULL DEFAULT 'active',

  created_by UUID NULL,
  updated_by UUID NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),

  is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
  deleted_at TIMESTAMP WITH TIME ZONE NULL,
  deleted_by UUID NULL
);
CREATE INDEX IF NOT EXISTS idx_warehouse_zones_company_id ON warehouse_zones (company_id) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_warehouse_zones_warehouse_id ON warehouse_zones (warehouse_id) WHERE is_deleted = FALSE;

CREATE TABLE IF NOT EXISTS racks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies (id),
  zone_id UUID NOT NULL REFERENCES warehouse_zones (id),

  code VARCHAR(100) NOT NULL,
  max_capacity NUMERIC(14, 2) NOT NULL DEFAULT 0,
  status VARCHAR(20) NOT NULL DEFAULT 'active',

  created_by UUID NULL,
  updated_by UUID NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),

  is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
  deleted_at TIMESTAMP WITH TIME ZONE NULL,
  deleted_by UUID NULL
);
CREATE INDEX IF NOT EXISTS idx_racks_company_id ON racks (company_id) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_racks_zone_id ON racks (zone_id) WHERE is_deleted = FALSE;

CREATE TABLE IF NOT EXISTS shelves (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies (id),
  rack_id UUID NOT NULL REFERENCES racks (id),

  code VARCHAR(100) NOT NULL,
  capacity NUMERIC(14, 2) NOT NULL DEFAULT 0,
  status VARCHAR(20) NOT NULL DEFAULT 'active',

  created_by UUID NULL,
  updated_by UUID NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),

  is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
  deleted_at TIMESTAMP WITH TIME ZONE NULL,
  deleted_by UUID NULL
);
CREATE INDEX IF NOT EXISTS idx_shelves_company_id ON shelves (company_id) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_shelves_rack_id ON shelves (rack_id) WHERE is_deleted = FALSE;

CREATE TABLE IF NOT EXISTS bins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies (id),
  shelf_id UUID NOT NULL REFERENCES shelves (id),

  code VARCHAR(100) NOT NULL,
  capacity NUMERIC(14, 2) NOT NULL DEFAULT 0,
  current_quantity NUMERIC(14, 2) NOT NULL DEFAULT 0,
  status VARCHAR(20) NOT NULL DEFAULT 'active',

  created_by UUID NULL,
  updated_by UUID NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),

  is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
  deleted_at TIMESTAMP WITH TIME ZONE NULL,
  deleted_by UUID NULL
);
CREATE INDEX IF NOT EXISTS idx_bins_company_id ON bins (company_id) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_bins_shelf_id ON bins (shelf_id) WHERE is_deleted = FALSE;
