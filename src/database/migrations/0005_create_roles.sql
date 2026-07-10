-- Service-01: RBAC — company_id NULL denotes a global/system role (e.g. seeded Admin,
-- Accountant, CA); non-null denotes a tenant-defined custom role.
CREATE TABLE IF NOT EXISTS roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NULL REFERENCES companies (id),

  key VARCHAR(100) NOT NULL,
  name VARCHAR(150) NOT NULL,
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

-- One role "key" per tenant scope (system roles have company_id NULL, so a plain UNIQUE
-- on key would forbid customers from ever reusing that key — coalesce NULL to a sentinel).
CREATE UNIQUE INDEX IF NOT EXISTS uq_roles_company_key
  ON roles (COALESCE(company_id, '00000000-0000-0000-0000-000000000000'), key)
  WHERE is_deleted = FALSE;
