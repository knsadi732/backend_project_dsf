CREATE TABLE IF NOT EXISTS grn_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  grn_id UUID NOT NULL REFERENCES grns (id),
  purchase_order_item_id UUID NOT NULL REFERENCES purchase_order_items (id),
  product_variant_id UUID NOT NULL REFERENCES product_variants (id),

  ordered_quantity NUMERIC(14, 2) NOT NULL,
  received_quantity NUMERIC(14, 2) NOT NULL,
  unit_cost NUMERIC(14, 2) NOT NULL,

  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_grn_items_grn_id ON grn_items (grn_id);
