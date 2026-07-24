-- Links each per-size sellable SKU (product_variants) back to its color/style
-- group (product_variant_groups). Nullable — ungrouped variants (single-SKU
-- products with no size/color split) remain valid.
ALTER TABLE product_variants
  ADD COLUMN IF NOT EXISTS variant_group_id UUID NULL REFERENCES product_variant_groups (id);

CREATE INDEX IF NOT EXISTS idx_product_variants_group_id
  ON product_variants (variant_group_id) WHERE is_deleted = FALSE;
