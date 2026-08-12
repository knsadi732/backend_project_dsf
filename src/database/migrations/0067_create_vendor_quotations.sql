-- A vendor's response to an RFQ: one quotation per vendor per RFQ, compared
-- side-by-side (plan.md 11.20 "Vendor selection must be based on quotation comparison").
CREATE TABLE IF NOT EXISTS vendor_quotations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies (id),
  rfq_id UUID NOT NULL REFERENCES rfqs (id),
  vendor_id UUID NOT NULL REFERENCES vendors (id),

  delivery_time_days INTEGER NULL,
  payment_terms TEXT NULL,
  validity_date DATE NULL,
  freight_amount NUMERIC(14, 2) NOT NULL DEFAULT 0,
  discount_amount NUMERIC(14, 2) NOT NULL DEFAULT 0,

  remarks TEXT NULL,
  created_by UUID NULL,
  updated_by UUID NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),

  is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
  deleted_at TIMESTAMP WITH TIME ZONE NULL,
  deleted_by UUID NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_vendor_quotation_rfq_vendor ON vendor_quotations (rfq_id, vendor_id) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_vendor_quotation_rfq_id ON vendor_quotations (rfq_id) WHERE is_deleted = FALSE;
