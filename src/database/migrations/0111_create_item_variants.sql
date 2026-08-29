-- Item & Material Master gets the same Item -> Variant -> SKU hierarchy the
-- Product Domain already has (Chapter 10) — an Item (e.g. "Shole"/Sole) can
-- come in multiple sizes/colors, each with its own stock count, cost, and
-- SKU, instead of forcing a separate duplicate Item row per size.
CREATE SEQUENCE IF NOT EXISTS item_variants_sku_seq START 1;

CREATE TABLE IF NOT EXISTS item_variants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies (id),
  item_id UUID NOT NULL REFERENCES items (id),

  sku VARCHAR(100) NOT NULL,
  size VARCHAR(30) NULL,
  color VARCHAR(50) NULL,
  standard_cost NUMERIC(14, 2) NULL, -- override; NULL falls back to the parent Item's own standard_cost
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

CREATE UNIQUE INDEX IF NOT EXISTS uq_item_variants_company_sku ON item_variants (company_id, sku) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_item_variants_item_id ON item_variants (item_id) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_item_variants_company_id ON item_variants (company_id) WHERE is_deleted = FALSE;

-- Backfill: exactly one Variant per existing Item (mirrors 0046/0047's
-- Product -> Product Variant backfill) — reuses the Item's own item_code as
-- the Variant's sku, so nothing existing loses its identifier.
INSERT INTO item_variants (company_id, item_id, sku, status, created_by, updated_by, created_at, updated_at)
SELECT company_id, id, item_code, status, created_by, updated_by, created_at, updated_at
FROM items
WHERE is_deleted = FALSE;
