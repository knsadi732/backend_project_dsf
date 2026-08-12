-- Links a PO back to the RFQ it was decided through, when one exists — direct/manual
-- PO creation (no RFQ) still works, this column just stays NULL for those.
ALTER TABLE purchase_orders ADD COLUMN IF NOT EXISTS rfq_id UUID NULL REFERENCES rfqs (id);
CREATE INDEX IF NOT EXISTS idx_po_rfq_id ON purchase_orders (rfq_id);
