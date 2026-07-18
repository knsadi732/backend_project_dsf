-- No unit_cost/vendor here — pricing and vendor selection happen later, at the Purchase Order stage.
CREATE TABLE IF NOT EXISTS purchase_request_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  purchase_request_id UUID NOT NULL REFERENCES purchase_requests (id),
  product_id UUID NOT NULL REFERENCES products (id),
  quantity NUMERIC(14, 2) NOT NULL,
  remarks TEXT NULL
);

CREATE INDEX IF NOT EXISTS idx_pr_items_pr_id ON purchase_request_items (purchase_request_id);
