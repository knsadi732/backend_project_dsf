-- Generic scheduled ledger postings — a fixed monthly expense (e.g. room
-- rent) or a loan's monthly interest — auto-debited on a given day of every
-- month by jobs/recurringCharges.job.js. `last_posted_month` (first-of-month
-- date) guards against posting twice for the same month if the job runs
-- more than once on the due day.
CREATE TABLE IF NOT EXISTS recurring_charges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies (id),
  branch_id UUID NULL REFERENCES branches (id),

  charge_type VARCHAR(30) NOT NULL, -- 'loan_interest' | 'fixed_expense'
  loan_id UUID NULL REFERENCES loans (id), -- required when charge_type = 'loan_interest'
  description VARCHAR(255) NOT NULL,
  category VARCHAR(100) NULL, -- expense category, used when charge_type = 'fixed_expense'
  fixed_amount NUMERIC(14, 2) NULL, -- required when charge_type = 'fixed_expense'; loan_interest computes its own amount
  day_of_month INTEGER NOT NULL, -- 1-28, the day each month this posts on

  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  last_posted_month DATE NULL,

  remarks TEXT NULL,
  created_by UUID NULL,
  updated_by UUID NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),

  is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
  deleted_at TIMESTAMP WITH TIME ZONE NULL,
  deleted_by UUID NULL,

  CONSTRAINT chk_recurring_charge_day CHECK (day_of_month BETWEEN 1 AND 28)
);

CREATE INDEX IF NOT EXISTS idx_recurring_charges_company_id ON recurring_charges (company_id) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_recurring_charges_day ON recurring_charges (day_of_month) WHERE is_deleted = FALSE AND is_active = TRUE;
