-- Service-02: Company & Settings Module — Global corporate parent (top of tenant hierarchy).
CREATE TABLE IF NOT EXISTS companies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  name VARCHAR(255) NOT NULL,
  legal_name VARCHAR(255),
  gstin VARCHAR(20),
  base_currency VARCHAR(10) NOT NULL DEFAULT 'INR',
  locale VARCHAR(10) NOT NULL DEFAULT 'en',
  theme VARCHAR(50) NOT NULL DEFAULT 'default',

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

CREATE INDEX IF NOT EXISTS idx_companies_status ON companies (status) WHERE is_deleted = FALSE;
