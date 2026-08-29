-- BOM's raw material side was wrongly wired to product_variants — Chapter
-- 7/8 of the business model is explicit that raw material belongs to the
-- Item & Material Master Domain, never Product (Product = only sellable
-- finished goods). Repoint both bill_of_materials and
-- material_issue_request_items to item_variants, same pattern as 0113's
-- purchase-chain repoint. No real data yet references the product side of
-- these columns (BOM/MIR predate any real raw-material product_variant
-- ever being created, since none could correctly exist), so this is a
-- straight column repoint, no backfill needed.

ALTER TABLE bill_of_materials DROP CONSTRAINT IF EXISTS bill_of_materials_raw_material_variant_id_fkey;
ALTER TABLE bill_of_materials
  ADD CONSTRAINT bill_of_materials_raw_material_variant_id_fkey
  FOREIGN KEY (raw_material_variant_id) REFERENCES item_variants (id);

ALTER TABLE material_issue_request_items DROP CONSTRAINT IF EXISTS material_issue_request_items_raw_material_variant_id_fkey;
ALTER TABLE material_issue_request_items
  ADD CONSTRAINT material_issue_request_items_raw_material_variant_id_fkey
  FOREIGN KEY (raw_material_variant_id) REFERENCES item_variants (id);
