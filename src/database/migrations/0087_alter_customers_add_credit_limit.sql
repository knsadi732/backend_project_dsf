-- Customer credit limit — vendors already had this (0059); customers didn't.
-- Needed for the credit-limit-override approval workflow (approval_requests,
-- request_type = 'credit_limit_override').
ALTER TABLE customers ADD COLUMN IF NOT EXISTS credit_limit NUMERIC(14, 2) NOT NULL DEFAULT 0;
