-- Accountant scope: printed operational client bills, generated off an order.
CREATE TABLE IF NOT EXISTS bills (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies (id),
  order_id UUID NOT NULL REFERENCES orders (id),

  bill_number VARCHAR(50) NOT NULL,
  gst_amount NUMERIC(14, 2) NOT NULL DEFAULT 0,
  total_amount NUMERIC(14, 2) NOT NULL,
  printed_by UUID NULL,
  printed_at TIMESTAMP WITH TIME ZONE NULL,

  status VARCHAR(30) NOT NULL DEFAULT 'generated',
  remarks TEXT NULL,
  created_by UUID NULL,
  updated_by UUID NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),

  is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
  deleted_at TIMESTAMP WITH TIME ZONE NULL,
  deleted_by UUID NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_bills_company_number ON bills (company_id, bill_number) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_bills_company_id ON bills (company_id) WHERE is_deleted = FALSE;
