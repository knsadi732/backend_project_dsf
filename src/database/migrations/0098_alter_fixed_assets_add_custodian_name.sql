-- Custodian is often the business owner/proprietor (e.g. Mamta Singh), who is not
-- necessarily a logged-in ERP user — same gap as finance_transactions.paid_received_by_name
-- (0092). custodian_name lets that be recorded even when there's no matching users row.
ALTER TABLE fixed_assets ADD COLUMN IF NOT EXISTS custodian_name VARCHAR(255) NULL;
ALTER TABLE fixed_asset_assignments ADD COLUMN IF NOT EXISTS custodian_name VARCHAR(255) NULL;
