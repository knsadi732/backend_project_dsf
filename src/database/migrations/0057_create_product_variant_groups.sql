-- Mid-tier between Product and the sellable per-size product_variants row:
-- groups variants by a shared attribute (today: color; future: color+material,
-- finish, etc.) so "WSD001-BLK" can hold sizes UK3..UK8 as separate SKUs
-- while still being addressable as one variant for merchandising/filtering.
CREATE TABLE IF NOT EXISTS product_variant_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies (id),
  product_id UUID NOT NULL REFERENCES products (id),

  group_sku VARCHAR(100) NOT NULL, -- e.g. 'WSD001-BLK' — a template code, not itself a sellable unit
  variant_name VARCHAR(150) NOT NULL, -- e.g. 'Black' today; future-proof for 'Black PU', 'Tan Matte', etc.
  color VARCHAR(50) NULL,

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

CREATE UNIQUE INDEX IF NOT EXISTS uq_product_variant_groups_company_sku
  ON product_variant_groups (company_id, group_sku) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_product_variant_groups_product_id
  ON product_variant_groups (product_id) WHERE is_deleted = FALSE;
