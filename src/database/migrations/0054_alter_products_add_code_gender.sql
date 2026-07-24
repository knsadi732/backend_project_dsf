-- Product master gains two attributes: product_code (a stable, user-facing
-- identifier distinct from any variant's SKU) and gender (a customer-facing
-- classification, orthogonal to product_type which is an inventory classification).
ALTER TABLE products
  ADD COLUMN IF NOT EXISTS product_code VARCHAR(50) NULL,
  ADD COLUMN IF NOT EXISTS gender VARCHAR(20) NULL; -- men | women | kids_boys | kids_girls | unisex

CREATE UNIQUE INDEX IF NOT EXISTS uq_products_company_code
  ON products (company_id, product_code) WHERE is_deleted = FALSE AND product_code IS NOT NULL;
