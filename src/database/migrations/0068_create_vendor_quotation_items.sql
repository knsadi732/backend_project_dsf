CREATE TABLE IF NOT EXISTS vendor_quotation_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_quotation_id UUID NOT NULL REFERENCES vendor_quotations (id),
  product_variant_id UUID NOT NULL REFERENCES product_variants (id),

  unit_price NUMERIC(14, 2) NOT NULL,
  gst_percentage NUMERIC(5, 2) NOT NULL DEFAULT 0,

  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_vq_items_quotation_id ON vendor_quotation_items (vendor_quotation_id);
