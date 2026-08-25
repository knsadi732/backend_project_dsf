-- Return rate, damage %, and marketplace cost are NOT one blanket number for
-- the whole business — a "Sandal" design and a "Sneaker" design can have
-- very different return behaviour and cost. Tying a settlement to the
-- specific product_variant sold (not just the order, which can carry
-- multiple line items) lets cost/return reporting be sliced per
-- product/category/variant, not just company-wide.
ALTER TABLE marketplace_settlements
  ADD COLUMN IF NOT EXISTS product_variant_id UUID NULL REFERENCES product_variants (id);

CREATE INDEX IF NOT EXISTS idx_marketplace_settlements_variant ON marketplace_settlements (product_variant_id) WHERE is_deleted = FALSE;
