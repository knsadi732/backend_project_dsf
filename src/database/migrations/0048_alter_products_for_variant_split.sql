-- plan.md Chapter 7.8: Product Master stores only business master data — no
-- SKU, no per-unit pricing (that now lives on product_variants).
DROP INDEX IF EXISTS uq_products_company_sku;

ALTER TABLE products
  ADD COLUMN IF NOT EXISTS brand_id UUID NULL REFERENCES brands (id),
  ADD COLUMN IF NOT EXISTS hsn_code VARCHAR(20) NULL,
  ADD COLUMN IF NOT EXISTS gst_percentage NUMERIC(5, 2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS product_type VARCHAR(30) NOT NULL DEFAULT 'finished_goods',
  ADD COLUMN IF NOT EXISTS bom_required BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS production_required BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS packaging_required BOOLEAN NOT NULL DEFAULT FALSE;

-- Carry the old per-SKU GST rate onto the product-level default before dropping it.
UPDATE products SET gst_percentage = tax_rate WHERE tax_rate IS NOT NULL;

ALTER TABLE products
  DROP COLUMN IF EXISTS sku,
  DROP COLUMN IF EXISTS unit_price,
  DROP COLUMN IF EXISTS cost_price,
  DROP COLUMN IF EXISTS tax_rate;

CREATE INDEX IF NOT EXISTS idx_products_brand_id ON products (brand_id) WHERE is_deleted = FALSE;
