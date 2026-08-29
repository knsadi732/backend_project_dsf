-- Item Stock and its movement ledger now key off the Variant (Chapter 8),
-- not the parent Item — same reasoning as warehouse_stock keying off
-- product_variant_id, not product_id (0049). Real quantities/history are
-- preserved via the 1:1 backfill from 0111 (exactly one Variant per
-- pre-existing Item).

-- item_stock
ALTER TABLE item_stock ADD COLUMN IF NOT EXISTS item_variant_id UUID NULL REFERENCES item_variants (id);
UPDATE item_stock s SET item_variant_id = iv.id FROM item_variants iv WHERE iv.item_id = s.item_id;
ALTER TABLE item_stock ALTER COLUMN item_variant_id SET NOT NULL;
DROP INDEX IF EXISTS uq_item_stock_warehouse_item;
ALTER TABLE item_stock DROP COLUMN item_id;
CREATE UNIQUE INDEX IF NOT EXISTS uq_item_stock_warehouse_variant ON item_stock (warehouse_id, item_variant_id) WHERE is_deleted = FALSE;

-- item_stock_movements
ALTER TABLE item_stock_movements ADD COLUMN IF NOT EXISTS item_variant_id UUID NULL REFERENCES item_variants (id);
UPDATE item_stock_movements m SET item_variant_id = iv.id FROM item_variants iv WHERE iv.item_id = m.item_id;
ALTER TABLE item_stock_movements ALTER COLUMN item_variant_id SET NOT NULL;
ALTER TABLE item_stock_movements DROP COLUMN item_id;
CREATE INDEX IF NOT EXISTS idx_item_stock_movements_variant ON item_stock_movements (item_variant_id) WHERE is_deleted = FALSE;
