-- Generalizes the "who funded this" concept beyond the `loans` table (which models
-- formal bank/vendor debt) to cover informal advances from a person, e.g. the owner
-- personally funding business expenses. Referenced by finance_transactions.funding_source_id
-- and expenses.funding_source_id.
CREATE TABLE IF NOT EXISTS funding_sources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies (id),

  party_name VARCHAR(255) NOT NULL,
  party_type VARCHAR(20) NOT NULL DEFAULT 'individual', -- individual | bank | vendor | other
  default_funding_type VARCHAR(20) NOT NULL DEFAULT 'advance', -- advance | loan | equity | other
  contact_info VARCHAR(255) NULL,

  status VARCHAR(30) NOT NULL DEFAULT 'active',
  created_by UUID NULL,
  updated_by UUID NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),

  is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
  deleted_at TIMESTAMP WITH TIME ZONE NULL,
  deleted_by UUID NULL
);

CREATE INDEX IF NOT EXISTS idx_funding_sources_company_id ON funding_sources (company_id) WHERE is_deleted = FALSE;
