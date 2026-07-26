-- Links the uploaded vendor invoice document directly onto its GRN row
-- (grn.service.js#uploadInvoice), so GRN detail can show invoice status without a join lookup.
ALTER TABLE grns
  ADD COLUMN IF NOT EXISTS vendor_invoice_document_id UUID NULL REFERENCES documents (id),
  ADD COLUMN IF NOT EXISTS vendor_invoice_uploaded_at TIMESTAMP WITH TIME ZONE NULL;
