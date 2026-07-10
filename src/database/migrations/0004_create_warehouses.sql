-- Service-02: Company hierarchy — physical Warehouse inventory outposts under a Branch.
CREATE TABLE IF NOT EXISTS warehouses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies (id),
  branch_id UUID NOT NULL REFERENCES branches (id),

  name VARCHAR(255) NOT NULL,
  code VARCHAR(50),
  address TEXT,

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

CREATE INDEX IF NOT EXISTS idx_warehouses_company_id ON warehouses (company_id) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_warehouses_branch_id ON warehouses (branch_id) WHERE is_deleted = FALSE;
