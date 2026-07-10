-- Accountant scope: warehouse expense recording.
CREATE TABLE IF NOT EXISTS expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies (id),
  warehouse_id UUID NULL REFERENCES warehouses (id),

  category VARCHAR(100) NOT NULL,
  amount NUMERIC(14, 2) NOT NULL,
  description TEXT,
  recorded_by UUID NULL,

  status VARCHAR(30) NOT NULL DEFAULT 'recorded',
  remarks TEXT NULL,
  created_by UUID NULL,
  updated_by UUID NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),

  is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
  deleted_at TIMESTAMP WITH TIME ZONE NULL,
  deleted_by UUID NULL
);

CREATE INDEX IF NOT EXISTS idx_expenses_company_id ON expenses (company_id) WHERE is_deleted = FALSE;
