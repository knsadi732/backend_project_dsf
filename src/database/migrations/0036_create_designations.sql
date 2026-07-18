-- Designation master, scoped per tenant. Referenced by users.job_title (free text today).
CREATE TABLE IF NOT EXISTS designations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies (id),

  name VARCHAR(150) NOT NULL,

  status VARCHAR(30) NOT NULL DEFAULT 'active',
  remarks TEXT NULL,

  created_by UUID NULL,
  updated_by UUID NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),

  is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
  deleted_at TIMESTAMP WITH TIME ZONE NULL,
  deleted_by UUID NULL
);

CREATE INDEX IF NOT EXISTS idx_designations_company_id ON designations (company_id) WHERE is_deleted = FALSE;
CREATE UNIQUE INDEX IF NOT EXISTS uq_designations_company_name ON designations (company_id, name) WHERE is_deleted = FALSE;
