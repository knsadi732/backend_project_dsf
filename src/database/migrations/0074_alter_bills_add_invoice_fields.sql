ALTER TABLE bills
  ADD COLUMN IF NOT EXISTS customer_id UUID NULL REFERENCES customers (id),
  ADD COLUMN IF NOT EXISTS due_date DATE NULL,
  ADD COLUMN IF NOT EXISTS balance_due NUMERIC(14, 2) NOT NULL DEFAULT 0;

ALTER TABLE bills ALTER COLUMN status SET DEFAULT 'unpaid';
UPDATE bills SET balance_due = total_amount WHERE balance_due = 0;
