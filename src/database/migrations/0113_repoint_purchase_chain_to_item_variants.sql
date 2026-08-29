-- Purchase Request/Order/Vendor-Quotation/GRN lines that reference an Item &
-- Material Master row now point at its Variant (item_variants), not the
-- parent Item — consistent with how they already reference product_variants,
-- never products, on the Product side. No real data yet uses the item side
-- of these tables' xor (0109/0113 predates any real Item purchase), so this
-- is a straight column swap, no backfill needed.

ALTER TABLE purchase_request_items DROP CONSTRAINT IF EXISTS chk_pri_variant_xor_item;
ALTER TABLE purchase_request_items ADD COLUMN IF NOT EXISTS item_variant_id UUID NULL REFERENCES item_variants (id);
ALTER TABLE purchase_request_items DROP COLUMN IF EXISTS item_id;
ALTER TABLE purchase_request_items ADD CONSTRAINT chk_pri_variant_xor_item
  CHECK ((product_variant_id IS NOT NULL) <> (item_variant_id IS NOT NULL));

ALTER TABLE purchase_order_items DROP CONSTRAINT IF EXISTS chk_poi_variant_xor_item;
ALTER TABLE purchase_order_items ADD COLUMN IF NOT EXISTS item_variant_id UUID NULL REFERENCES item_variants (id);
ALTER TABLE purchase_order_items DROP COLUMN IF EXISTS item_id;
ALTER TABLE purchase_order_items ADD CONSTRAINT chk_poi_variant_xor_item
  CHECK ((product_variant_id IS NOT NULL) <> (item_variant_id IS NOT NULL));

ALTER TABLE vendor_quotation_items DROP CONSTRAINT IF EXISTS chk_vqi_variant_xor_item;
ALTER TABLE vendor_quotation_items ADD COLUMN IF NOT EXISTS item_variant_id UUID NULL REFERENCES item_variants (id);
ALTER TABLE vendor_quotation_items DROP COLUMN IF EXISTS item_id;
ALTER TABLE vendor_quotation_items ADD CONSTRAINT chk_vqi_variant_xor_item
  CHECK ((product_variant_id IS NOT NULL) <> (item_variant_id IS NOT NULL));

ALTER TABLE grn_items DROP CONSTRAINT IF EXISTS chk_grni_variant_xor_item;
ALTER TABLE grn_items ADD COLUMN IF NOT EXISTS item_variant_id UUID NULL REFERENCES item_variants (id);
ALTER TABLE grn_items DROP COLUMN IF EXISTS item_id;
ALTER TABLE grn_items ADD CONSTRAINT chk_grni_variant_xor_item
  CHECK ((product_variant_id IS NOT NULL) <> (item_variant_id IS NOT NULL));
