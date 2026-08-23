-- Generic one-click approval queue for Superadmin/Owner — currently backs
-- two request types: a vendor payment above the normal flow, and a
-- customer credit-limit override. `reference_type`/`reference_id` point at
-- the thing being approved; `payload` carries the type-specific numbers
-- needed to actually execute the action once approved (e.g. {amount,
-- utrNumber} for a vendor payment, {requestedLimit} for a credit override) —
-- execution happens in the same transaction as the status flip to
-- "approved" (approvalRequest.service.js approve()), same pattern as
-- Material Issue Requests.
CREATE TABLE IF NOT EXISTS approval_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies (id),

  request_type VARCHAR(30) NOT NULL, -- vendor_payment | credit_limit_override
  reference_type VARCHAR(30) NOT NULL, -- vendor_bill | customer
  reference_id UUID NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,

  status VARCHAR(30) NOT NULL DEFAULT 'pending_approval',
  version INTEGER NOT NULL DEFAULT 1,

  requested_by UUID NULL,
  approved_by UUID NULL,
  approved_at TIMESTAMP WITH TIME ZONE NULL,

  remarks TEXT NULL,
  created_by UUID NULL,
  updated_by UUID NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),

  is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
  deleted_at TIMESTAMP WITH TIME ZONE NULL,
  deleted_by UUID NULL
);

CREATE INDEX IF NOT EXISTS idx_approval_requests_company_id ON approval_requests (company_id) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_approval_requests_status ON approval_requests (status) WHERE is_deleted = FALSE;
