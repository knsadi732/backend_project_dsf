-- Every inventory/purchase/sales line now references the Product Variant
-- (SKU), not the Product Master (plan.md Chapter 9.9/9.13). Because
-- 0047 created exactly one variant per legacy product, the join below is 1:1
-- and loses no data.

-- warehouse_stock
ALTER TABLE warehouse_stock ADD COLUMN IF NOT EXISTS product_variant_id UUID NULL REFERENCES product_variants (id);
UPDATE warehouse_stock ws SET product_variant_id = pv.id FROM product_variants pv WHERE pv.product_id = ws.product_id;
ALTER TABLE warehouse_stock ALTER COLUMN product_variant_id SET NOT NULL;
DROP INDEX IF EXISTS uq_warehouse_stock_wh_product;
ALTER TABLE warehouse_stock DROP COLUMN product_id;
CREATE UNIQUE INDEX IF NOT EXISTS uq_warehouse_stock_wh_variant ON warehouse_stock (warehouse_id, product_variant_id) WHERE is_deleted = FALSE;

-- order_items
ALTER TABLE order_items ADD COLUMN IF NOT EXISTS product_variant_id UUID NULL REFERENCES product_variants (id);
UPDATE order_items oi SET product_variant_id = pv.id FROM product_variants pv WHERE pv.product_id = oi.product_id;
ALTER TABLE order_items ALTER COLUMN product_variant_id SET NOT NULL;
ALTER TABLE order_items DROP COLUMN product_id;

-- purchase_order_items
ALTER TABLE purchase_order_items ADD COLUMN IF NOT EXISTS product_variant_id UUID NULL REFERENCES product_variants (id);
UPDATE purchase_order_items poi SET product_variant_id = pv.id FROM product_variants pv WHERE pv.product_id = poi.product_id;
ALTER TABLE purchase_order_items ALTER COLUMN product_variant_id SET NOT NULL;
ALTER TABLE purchase_order_items DROP COLUMN product_id;

-- purchase_request_items
ALTER TABLE purchase_request_items ADD COLUMN IF NOT EXISTS product_variant_id UUID NULL REFERENCES product_variants (id);
UPDATE purchase_request_items pri SET product_variant_id = pv.id FROM product_variants pv WHERE pv.product_id = pri.product_id;
ALTER TABLE purchase_request_items ALTER COLUMN product_variant_id SET NOT NULL;
ALTER TABLE purchase_request_items DROP COLUMN product_id;
