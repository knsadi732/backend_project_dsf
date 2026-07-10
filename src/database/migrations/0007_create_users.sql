-- Service-03: User Management — internal personnel profiles.
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies (id),
  branch_id UUID NULL REFERENCES branches (id),
  warehouse_id UUID NULL REFERENCES warehouses (id),
  role_id UUID NOT NULL REFERENCES roles (id),

  employee_id VARCHAR(50),
  full_name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  department VARCHAR(100),
  job_title VARCHAR(100),

  status VARCHAR(30) NOT NULL DEFAULT 'active',
  remarks TEXT NULL,

  -- Optimistic locking for low-contention profile updates (plan.md Chapter 4).
  version INTEGER NOT NULL DEFAULT 1,

  created_by UUID NULL,
  updated_by UUID NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),

  is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
  deleted_at TIMESTAMP WITH TIME ZONE NULL,
  deleted_by UUID NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_users_email ON users (email) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_users_company_id ON users (company_id) WHERE is_deleted = FALSE;
