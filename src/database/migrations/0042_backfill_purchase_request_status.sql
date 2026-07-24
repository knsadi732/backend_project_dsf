-- Old lifecycle only had pending/approved/rejected; map the old 'pending' value
-- onto the new lifecycle's 'pending_approval' state (see enums.js PURCHASE_REQUEST_STATUS).
UPDATE purchase_requests SET status = 'pending_approval' WHERE status = 'pending';
