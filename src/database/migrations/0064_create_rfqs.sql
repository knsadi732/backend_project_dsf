-- RFQ (Request for Quotation): raised against an approved Purchase Request,
-- sent to one or more vendors (see rfq_vendors), collects Vendor Quotations,
-- and drives Vendor Selection ahead of Purchase Order creation (plan.md 11.20).
CREATE TABLE IF NOT EXISTS rfqs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies (id),
  branch_id UUID NULL REFERENCES branches (id),
  purchase_request_id UUID NOT NULL REFERENCES purchase_requests (id),

  rfq_number VARCHAR(50) NOT NULL,
  status VARCHAR(30) NOT NULL DEFAULT 'draft',
  version INTEGER NOT NULL DEFAULT 1,

  delivery_location TEXT NULL,
  delivery_date DATE NULL,
  payment_terms TEXT NULL,
  technical_specifications TEXT NULL,

  remarks TEXT NULL,
  created_by UUID NULL,
  updated_by UUID NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),

  is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
  deleted_at TIMESTAMP WITH TIME ZONE NULL,
  deleted_by UUID NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_rfq_company_number ON rfqs (company_id, rfq_number) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_rfq_company_id ON rfqs (company_id) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_rfq_purchase_request_id ON rfqs (purchase_request_id);
