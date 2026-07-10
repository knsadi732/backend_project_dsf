CREATE TABLE IF NOT EXISTS purchase_order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  purchase_order_id UUID NOT NULL REFERENCES purchase_orders (id),
  product_id UUID NOT NULL REFERENCES products (id),

  quantity NUMERIC(14, 2) NOT NULL,
  unit_cost NUMERIC(14, 2) NOT NULL,
  line_total NUMERIC(14, 2) NOT NULL,

  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_po_items_po_id ON purchase_order_items (purchase_order_id);
