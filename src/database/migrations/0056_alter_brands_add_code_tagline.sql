ALTER TABLE brands
  ADD COLUMN IF NOT EXISTS brand_code VARCHAR(20) NULL,
  ADD COLUMN IF NOT EXISTS tagline VARCHAR(255) NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_brands_company_code
  ON brands (company_id, brand_code) WHERE is_deleted = FALSE AND brand_code IS NOT NULL;
