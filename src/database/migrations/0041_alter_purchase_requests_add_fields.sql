-- plan.md Chapter 11.4: Purchase Request Information adds Priority and Required Date.
-- Status default moves to 'draft' to match the new Draft -> Submitted -> Pending Approval
-- -> Approved/Rejected -> Converted to RFQ lifecycle (see purchaseRequest.service.js).
ALTER TABLE purchase_requests
  ADD COLUMN IF NOT EXISTS priority VARCHAR(20) NOT NULL DEFAULT 'medium',
  ADD COLUMN IF NOT EXISTS required_date DATE NULL;

ALTER TABLE purchase_requests ALTER COLUMN status SET DEFAULT 'draft';
