-- plan.md Chapter 11.10: a Purchase Order references its originating Purchase Request,
-- plus Delivery Address, Taxes, Payment Terms and Expected Delivery Date.
ALTER TABLE purchase_orders
  ADD COLUMN IF NOT EXISTS purchase_request_id UUID NULL REFERENCES purchase_requests (id),
  ADD COLUMN IF NOT EXISTS delivery_address TEXT NULL,
  ADD COLUMN IF NOT EXISTS tax_amount NUMERIC(14, 2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS payment_terms VARCHAR(255) NULL,
  ADD COLUMN IF NOT EXISTS expected_delivery_date DATE NULL;

CREATE INDEX IF NOT EXISTS idx_po_purchase_request_id ON purchase_orders (purchase_request_id);
