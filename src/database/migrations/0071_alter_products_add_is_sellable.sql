-- A Product's productType (raw_material, semi_finished_goods, ...) describes
-- what it IS, not whether it can be sold. In a multi-stage production chain
-- (e.g. boiler dept output "Sole" is raw material for the assembly dept, but
-- that same Sole can also be sold directly to market), an item's sellability
-- is independent of its productType. is_sellable lets a product carry both
-- roles at once instead of forcing a single fixed classification.
ALTER TABLE products
  ADD COLUMN IF NOT EXISTS is_sellable BOOLEAN NOT NULL DEFAULT TRUE;

UPDATE products
SET is_sellable = FALSE
WHERE product_type IN ('raw_material', 'packaging_material', 'consumable');
