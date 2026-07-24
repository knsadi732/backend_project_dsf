-- One-time backfill: every pre-existing product row (which was itself a flat
-- SKU) becomes exactly one product_variant, preserving id linkage so the next
-- migration can repoint downstream FKs (warehouse_stock/order_items/etc.)
-- from product_id to product_variant_id without losing history.
INSERT INTO product_variants (
  company_id, product_id, sku, mrp, selling_price, cost_price, status,
  created_by, updated_by, created_at, updated_at, is_deleted, deleted_at, deleted_by
)
SELECT
  company_id, id, sku, unit_price, unit_price, cost_price, status,
  created_by, updated_by, created_at, updated_at, is_deleted, deleted_at, deleted_by
FROM products;
