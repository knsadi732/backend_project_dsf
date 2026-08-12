-- Vendor Selection (plan.md 11.20): the RFQ records which quotation won,
-- pinning both the selected vendor and the priced items it will carry into the PO.
ALTER TABLE rfqs ADD COLUMN IF NOT EXISTS selected_vendor_quotation_id UUID NULL REFERENCES vendor_quotations (id);
