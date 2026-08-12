-- A work order was only tied to the generic product, losing which
-- size/color/SKU actually needs producing — tie it to the specific variant
-- instead (nullable since a manually-raised WO can still target the
-- product broadly, e.g. before a size split is decided).
ALTER TABLE work_orders ADD COLUMN IF NOT EXISTS product_variant_id UUID NULL REFERENCES product_variants (id);
CREATE INDEX IF NOT EXISTS idx_work_orders_product_variant_id ON work_orders (product_variant_id) WHERE is_deleted = FALSE;
