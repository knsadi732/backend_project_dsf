-- Accountant scope: instant client payment slips.
CREATE TABLE IF NOT EXISTS payment_slips (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies (id),
  order_id UUID NULL REFERENCES orders (id),
  customer_id UUID NOT NULL REFERENCES customers (id),

  slip_number VARCHAR(50) NOT NULL,
  amount NUMERIC(14, 2) NOT NULL,
  payment_mode VARCHAR(30) NOT NULL DEFAULT 'cash', -- cash | upi | card | bank_transfer
  issued_by UUID NULL,

  status VARCHAR(30) NOT NULL DEFAULT 'issued',
  remarks TEXT NULL,
  created_by UUID NULL,
  updated_by UUID NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),

  is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
  deleted_at TIMESTAMP WITH TIME ZONE NULL,
  deleted_by UUID NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_payment_slips_company_number ON payment_slips (company_id, slip_number) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_payment_slips_company_id ON payment_slips (company_id) WHERE is_deleted = FALSE;
