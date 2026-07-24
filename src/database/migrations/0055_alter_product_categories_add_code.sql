-- User-facing short code for a category (e.g. 'SAN' for Sandals), distinct
-- from its UUID id — useful for imports/exports and reporting.
ALTER TABLE product_categories
  ADD COLUMN IF NOT EXISTS category_code VARCHAR(20) NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_product_categories_company_code
  ON product_categories (company_id, category_code) WHERE is_deleted = FALSE AND category_code IS NOT NULL;
