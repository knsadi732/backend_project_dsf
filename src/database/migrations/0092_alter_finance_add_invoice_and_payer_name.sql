-- 'Paid/Received By' in the owner's manual ledger is often the business's actual
-- proprietor/owner, who is not necessarily a logged-in ERP user (e.g. Mamta Singh,
-- Proprietor of DS Footwear) — paid_received_by_name lets that be recorded even when
-- there's no matching users row, without forcing a fake login account into existence.
-- invoice_number is kept distinct from utr_reference: a UTR/transaction id identifies
-- the bank/UPI transfer, while an invoice/order number (e.g. an Amazon order id on a
-- card purchase) identifies the vendor's bill — conflating them was a seed-data bug.
ALTER TABLE finance_transactions
  ADD COLUMN IF NOT EXISTS paid_received_by_name VARCHAR(255) NULL,
  ADD COLUMN IF NOT EXISTS invoice_number VARCHAR(100) NULL;

ALTER TABLE expenses
  ADD COLUMN IF NOT EXISTS paid_received_by_name VARCHAR(255) NULL,
  ADD COLUMN IF NOT EXISTS invoice_number VARCHAR(100) NULL;
