-- The set of vendors an RFQ was sent to — a quotation may only be recorded
-- for a vendor listed here (plan.md 11.20: "Every quotation must reference a valid RFQ").
CREATE TABLE IF NOT EXISTS rfq_vendors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rfq_id UUID NOT NULL REFERENCES rfqs (id),
  vendor_id UUID NOT NULL REFERENCES vendors (id),
  sent_at TIMESTAMP WITH TIME ZONE NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_rfq_vendor ON rfq_vendors (rfq_id, vendor_id);
CREATE INDEX IF NOT EXISTS idx_rfq_vendors_rfq_id ON rfq_vendors (rfq_id);
