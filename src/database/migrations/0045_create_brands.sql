-- plan.md Chapter 7.7: every Product belongs to one Brand.
CREATE TABLE IF NOT EXISTS brands (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies (id),

  name VARCHAR(150) NOT NULL,
  logo_document_id UUID NULL REFERENCES documents (id),
  country VARCHAR(100) NULL,
  description TEXT NULL,

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

CREATE UNIQUE INDEX IF NOT EXISTS uq_brands_company_name ON brands (company_id, name) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_brands_company_id ON brands (company_id) WHERE is_deleted = FALSE;
