-- Supports partial/repeatable issuance (materialIssueRequest.service.js
-- issue()): per-line running total of what's actually been handed over so
-- far, plus when the MIR as a whole finally reached "issued".
ALTER TABLE material_issue_request_items ADD COLUMN IF NOT EXISTS quantity_issued NUMERIC(14, 4) NOT NULL DEFAULT 0;
ALTER TABLE material_issue_requests ADD COLUMN IF NOT EXISTS issued_at TIMESTAMP WITH TIME ZONE NULL;
