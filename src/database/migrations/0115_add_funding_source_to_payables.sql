-- Links a payable to the funding source whose advances it tracks (e.g. an
-- "Owner Advance Reimbursement" payable for the owner's funding source),
-- so its total_amount can be kept in sync with actual advance-funded
-- expenses instead of being a one-time manual snapshot.
ALTER TABLE payables ADD COLUMN IF NOT EXISTS funding_source_id UUID REFERENCES funding_sources(id);
CREATE INDEX IF NOT EXISTS idx_payables_funding_source ON payables (funding_source_id) WHERE is_deleted = FALSE;
