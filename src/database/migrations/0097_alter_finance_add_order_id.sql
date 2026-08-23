-- 'Order ID' (e.g. an Amazon order number like 407-8817623-7861119) and 'Invoice
-- Number' (the seller's actual tax invoice number, e.g. CCX1-1271254) are distinct
-- values on the same purchase — conflating them was a data-entry gap. Kept alongside
-- the existing invoice_number column rather than replacing it.
ALTER TABLE finance_transactions
  ADD COLUMN IF NOT EXISTS order_id VARCHAR(100) NULL;

ALTER TABLE expenses
  ADD COLUMN IF NOT EXISTS order_id VARCHAR(100) NULL;
