-- Extends the entire Purchase pipeline (Purchase Request -> RFQ -> Vendor
-- Quotation -> Purchase Order -> GRN) to also order Item & Material Master
-- entries (Chapter 8 — raw material/packaging/consumable/spare/tool/service
-- rows in `items`), not just sellable-Product `product_variants`. Until now
-- every line item table below referenced product_variants exclusively, so an
-- Item Master row (e.g. Leather, EVA) had no way to be requested/ordered
-- through actual purchasing — only a duplicate non-sellable Product could.
-- Each line item now references EXACTLY ONE of product_variant_id/item_id.

ALTER TABLE purchase_request_items ADD COLUMN IF NOT EXISTS item_id UUID NULL REFERENCES items (id);
ALTER TABLE purchase_request_items ALTER COLUMN product_variant_id DROP NOT NULL;
ALTER TABLE purchase_request_items ADD CONSTRAINT chk_pri_variant_xor_item
  CHECK ((product_variant_id IS NOT NULL) <> (item_id IS NOT NULL));

ALTER TABLE purchase_order_items ADD COLUMN IF NOT EXISTS item_id UUID NULL REFERENCES items (id);
ALTER TABLE purchase_order_items ALTER COLUMN product_variant_id DROP NOT NULL;
ALTER TABLE purchase_order_items ADD CONSTRAINT chk_poi_variant_xor_item
  CHECK ((product_variant_id IS NOT NULL) <> (item_id IS NOT NULL));

ALTER TABLE vendor_quotation_items ADD COLUMN IF NOT EXISTS item_id UUID NULL REFERENCES items (id);
ALTER TABLE vendor_quotation_items ALTER COLUMN product_variant_id DROP NOT NULL;
ALTER TABLE vendor_quotation_items ADD CONSTRAINT chk_vqi_variant_xor_item
  CHECK ((product_variant_id IS NOT NULL) <> (item_id IS NOT NULL));

ALTER TABLE grn_items ADD COLUMN IF NOT EXISTS item_id UUID NULL REFERENCES items (id);
ALTER TABLE grn_items ALTER COLUMN product_variant_id DROP NOT NULL;
ALTER TABLE grn_items ADD CONSTRAINT chk_grni_variant_xor_item
  CHECK ((product_variant_id IS NOT NULL) <> (item_id IS NOT NULL));
