-- Payment Advice entries are matched against the printed Tax Invoice (bills),
-- not picked as a standalone Sales Order — order_id is now derived from the
-- selected invoice (bills.order_id) rather than chosen independently.
ALTER TABLE marketplace_settlements
  ADD COLUMN IF NOT EXISTS bill_id UUID NULL REFERENCES bills (id);

CREATE INDEX IF NOT EXISTS idx_marketplace_settlements_bill ON marketplace_settlements (bill_id) WHERE is_deleted = FALSE;
