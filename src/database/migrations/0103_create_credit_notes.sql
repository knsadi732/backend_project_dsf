-- Credit note auto-issued when a return resolves with resolutionType='refund'
-- (return.service.js resolveReturn) — the "credit note" concept the Finance
-- Chapter references but that previously only existed as a frontend mock.
CREATE SEQUENCE IF NOT EXISTS credit_notes_seq START 1;

CREATE TABLE IF NOT EXISTS credit_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies (id),
  return_id UUID NOT NULL REFERENCES returns (id),
  bill_id UUID NULL REFERENCES bills (id),
  customer_id UUID NULL REFERENCES customers (id),

  credit_note_number VARCHAR(50) NOT NULL,
  amount NUMERIC(14, 2) NOT NULL,
  gst_amount NUMERIC(14, 2) NOT NULL DEFAULT 0,

  created_by UUID NULL,
  updated_by UUID NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),

  is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
  deleted_at TIMESTAMP WITH TIME ZONE NULL,
  deleted_by UUID NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_credit_notes_company_number ON credit_notes (company_id, credit_note_number) WHERE is_deleted = FALSE;
CREATE UNIQUE INDEX IF NOT EXISTS uq_credit_notes_return_id ON credit_notes (return_id) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_credit_notes_company_id ON credit_notes (company_id) WHERE is_deleted = FALSE;
