-- CA function: statutory audit records (plan.md Chapter 2, Service-01 CA scope).
CREATE TABLE IF NOT EXISTS statutory_audits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies (id),
  fiscal_period_id UUID NULL REFERENCES fiscal_periods (id),

  auditor_name VARCHAR(255) NOT NULL,
  status VARCHAR(30) NOT NULL DEFAULT 'pending', -- pending | in_review | completed
  conducted_at DATE NOT NULL,
  findings TEXT NULL,

  remarks TEXT NULL,
  created_by UUID NULL,
  updated_by UUID NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),

  is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
  deleted_at TIMESTAMP WITH TIME ZONE NULL,
  deleted_by UUID NULL
);

CREATE INDEX IF NOT EXISTS idx_statutory_audits_company_id ON statutory_audits (company_id) WHERE is_deleted = FALSE;
